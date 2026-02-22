import Link from "next/link"
import { Suspense } from "react"
import { cookies, headers } from "next/headers"
import prisma from "@/lib/prisma"
import OrgSwitcher from "@/components/OrgSwitcher"
import OrganizationSection from "@/components/dashboard/OrganizationSection"

export const dynamic = "force-dynamic"

interface ApiOrg {
  id: string
  name: string
  type: string
  role: string
}

interface ApiProject {
  id: string
  name: string
  metaAdAccountId: string | null
}

interface ApiCampaign {
  id: string
  name: string
  status: string
  objective: string
  metaCampaignId: string
}

interface CampaignMetric {
  id: string
  name: string
  status: string
  objective: string
  impressions: number
  clicks: number
  spend: number
  ctr: number
}

interface DashboardProject {
  id: string
  name: string
  metaAdAccountId: string | null
  campaigns: CampaignMetric[]
  error?: string
}

interface DashboardOrg {
  id: string
  name: string
  type: string
  role: string
  projects: DashboardProject[]
  projectError?: string
}

function singleSearchParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value
}

function toNumber(value: unknown) {
  const parsed = Number(value ?? 0)
  return Number.isFinite(parsed) ? parsed : 0
}

function toDateInput(date: Date) {
  return date.toISOString().slice(0, 10)
}

function buildBaseUrl() {
  const forwardedHost = headers().get("x-forwarded-host")
  const host = forwardedHost ?? headers().get("host")
  const protocol = headers().get("x-forwarded-proto") ?? "http"
  const envBaseUrl = process.env.NEXTAUTH_URL?.replace(/\/$/, "")

  if (envBaseUrl) return envBaseUrl
  if (!host) throw new Error("Cannot resolve request host")

  return `${protocol}://${host}`
}

function buildCookieHeader() {
  return cookies()
    .getAll()
    .map((cookie) => `${cookie.name}=${cookie.value}`)
    .join("; ")
}

async function requestJson<T>(url: string, init: RequestInit) {
  const response = await fetch(url, {
    ...init,
    cache: "no-store",
  })

  if (!response.ok) {
    let errorMessage = `Request failed (${response.status})`
    try {
      const payload = (await response.json()) as { error?: string }
      if (payload?.error) errorMessage = payload.error
    } catch {
      // Ignore non-JSON failures.
    }
    throw new Error(errorMessage)
  }

  return (await response.json()) as T
}

async function loadProjectMetrics({
  project,
  baseUrl,
  requestHeaders,
  since,
  until,
  sinceBoundary,
}: {
  project: ApiProject
  baseUrl: string
  requestHeaders: Record<string, string>
  since: string
  until: string
  sinceBoundary: Date
}): Promise<DashboardProject> {
  if (!project.metaAdAccountId) {
    return {
      id: project.id,
      name: project.name,
      metaAdAccountId: project.metaAdAccountId,
      campaigns: [],
    }
  }

  try {
    const campaignData = await requestJson<{ campaigns?: ApiCampaign[] }>(
      `${baseUrl}/api/ads/campaigns/list?projectId=${project.id}`,
      {
        headers: requestHeaders,
      }
    )

    const campaigns = campaignData.campaigns ?? []
    const campaignsWithMetaId = campaigns.filter((campaign) => campaign.metaCampaignId)

    if (campaignsWithMetaId.length === 0) {
      return {
        id: project.id,
        name: project.name,
        metaAdAccountId: project.metaAdAccountId,
        campaigns: [],
      }
    }

    const refreshResponses = await Promise.allSettled(
      campaignsWithMetaId.map((campaign) =>
        fetch(`${baseUrl}/api/meta/insights`, {
          method: "POST",
          headers: {
            ...requestHeaders,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            projectId: project.id,
            entityId: campaign.metaCampaignId,
            level: "campaign",
            since,
            until,
          }),
          cache: "no-store",
        })
      )
    )

    const refreshHadError = refreshResponses.some(
      (result) => result.status === "rejected" || !result.value.ok
    )

    const insightRows = await prisma.insightDaily.findMany({
      where: {
        projectId: project.id,
        level: "campaign",
        entityId: { in: campaignsWithMetaId.map((campaign) => campaign.metaCampaignId) },
        date: { gte: sinceBoundary },
      },
      select: {
        entityId: true,
        metrics_json: true,
      },
    })

    const metricsByCampaignId = new Map<
      string,
      { impressions: number; clicks: number; spend: number }
    >()

    for (const row of insightRows) {
      const metrics = row.metrics_json as Record<string, unknown>
      const current = metricsByCampaignId.get(row.entityId) ?? {
        impressions: 0,
        clicks: 0,
        spend: 0,
      }

      current.impressions += toNumber(metrics.impressions)
      current.clicks += toNumber(metrics.clicks)
      current.spend += toNumber(metrics.spend)
      metricsByCampaignId.set(row.entityId, current)
    }

    const performance = campaignsWithMetaId.map((campaign) => {
      const totals = metricsByCampaignId.get(campaign.metaCampaignId) ?? {
        impressions: 0,
        clicks: 0,
        spend: 0,
      }

      const ctr = totals.impressions > 0 ? (totals.clicks / totals.impressions) * 100 : 0

      return {
        id: campaign.id,
        name: campaign.name,
        status: campaign.status,
        objective: campaign.objective,
        impressions: totals.impressions,
        clicks: totals.clicks,
        spend: totals.spend,
        ctr,
      }
    })

    return {
      id: project.id,
      name: project.name,
      metaAdAccountId: project.metaAdAccountId,
      campaigns: performance,
      ...(refreshHadError && {
        error: "Some campaigns could not be refreshed from Meta; showing stored metrics.",
      }),
    }
  } catch (error) {
    return {
      id: project.id,
      name: project.name,
      metaAdAccountId: project.metaAdAccountId,
      campaigns: [],
      error: error instanceof Error ? error.message : "Unable to load project campaigns.",
    }
  }
}

async function loadDashboardData({
  projectIdFilter,
  orgIdFilter,
}: {
  projectIdFilter?: string
  orgIdFilter?: string
}): Promise<{ orgs: DashboardOrg[]; globalError?: string }> {
  try {
    const baseUrl = buildBaseUrl()
    const cookieHeader = buildCookieHeader()
    const requestHeaders: Record<string, string> = cookieHeader
      ? { cookie: cookieHeader }
      : {}

    const orgData = await requestJson<{ orgs?: ApiOrg[] }>(`${baseUrl}/api/orgs/list`, {
      headers: requestHeaders,
    })
    const allOrgs = orgData.orgs ?? []
    const orgs = orgIdFilter ? allOrgs.filter((org) => org.id === orgIdFilter) : allOrgs

    const now = new Date()
    const sinceDate = new Date(now)
    sinceDate.setDate(now.getDate() - 7)
    const since = toDateInput(sinceDate)
    const until = toDateInput(now)
    const sinceBoundary = new Date(`${since}T00:00:00.000Z`)

    const orgsWithProjects = await Promise.all(
      orgs.map(async (org): Promise<DashboardOrg> => {
        try {
          const projectData = await requestJson<{ projects?: ApiProject[] }>(
            `${baseUrl}/api/projects/list?orgId=${org.id}`,
            { headers: requestHeaders }
          )
          const projects = projectData.projects ?? []
          const visibleProjects = projectIdFilter
            ? projects.filter((project) => project.id === projectIdFilter)
            : projects

          const projectMetrics = await Promise.all(
            visibleProjects.map((project) =>
              loadProjectMetrics({
                project,
                baseUrl,
                requestHeaders,
                since,
                until,
                sinceBoundary,
              })
            )
          )

          return {
            id: org.id,
            name: org.name,
            type: org.type,
            role: org.role,
            projects: projectMetrics,
          }
        } catch (error) {
          return {
            id: org.id,
            name: org.name,
            type: org.type,
            role: org.role,
            projects: [],
            projectError:
              error instanceof Error
                ? error.message
                : "Unable to load projects for this organization.",
          }
        }
      })
    )

    const filteredOrgs = projectIdFilter
      ? orgsWithProjects.filter((org) => org.projects.length > 0)
      : orgsWithProjects

    return { orgs: filteredOrgs }
  } catch (error) {
    return {
      orgs: [],
      globalError: error instanceof Error ? error.message : "Unable to load dashboard data.",
    }
  }
}

function TopBar({ projectIdFilter }: { projectIdFilter?: string }) {
  return (
    <header className="sticky top-0 z-30 border-b border-gray-800 bg-gray-950/95 backdrop-blur">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-3 px-6 py-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-6">
          <Link href="/dashboard" className="text-base font-semibold tracking-tight text-white">
            Growth Engine
          </Link>
          <nav className="flex items-center gap-2 text-sm text-gray-400">
            <Link href="/orgs" className="rounded-md px-3 py-1.5 transition hover:bg-gray-800 hover:text-white">
              Organizations
            </Link>
            <Link href="/projects" className="rounded-md px-3 py-1.5 transition hover:bg-gray-800 hover:text-white">
              Projects
            </Link>
            <Link href="/dashboard" className="rounded-md bg-gray-800 px-3 py-1.5 text-white">
              Dashboard
            </Link>
          </nav>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {projectIdFilter && (
            <span className="rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3 py-1 text-xs font-semibold text-indigo-300">
              Project filter active
            </span>
          )}
          <div className="[&_select]:rounded-md [&_select]:border [&_select]:border-gray-700 [&_select]:bg-gray-900 [&_select]:px-3 [&_select]:py-2 [&_select]:text-sm [&_select]:text-gray-200 [&_select]:outline-none [&_select]:transition [&_select]:focus:border-indigo-500 [&_select]:focus:ring-1 [&_select]:focus:ring-indigo-500/40">
            <OrgSwitcher />
          </div>
        </div>
      </div>
    </header>
  )
}

function DashboardLoadingState() {
  return (
    <main className="mx-auto w-full max-w-7xl px-6 py-10">
      <div className="mb-8 animate-pulse">
        <div className="h-9 w-56 rounded bg-gray-800" />
        <div className="mt-3 h-5 w-96 max-w-full rounded bg-gray-800" />
      </div>

      <div className="space-y-6">
        {[1, 2].map((section) => (
          <div key={section} className="animate-pulse rounded-xl border border-gray-800 bg-gray-900 p-6">
            <div className="mb-6 h-7 w-64 rounded bg-gray-800" />
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {[1, 2, 3, 4].map((item) => (
                <div key={item} className="rounded-lg border border-gray-800 bg-gray-950 p-4">
                  <div className="h-4 w-24 rounded bg-gray-800" />
                  <div className="mt-3 h-8 w-28 rounded bg-gray-800" />
                </div>
              ))}
            </div>
            <div className="mt-6 h-56 rounded-lg border border-gray-800 bg-gray-950" />
          </div>
        ))}
      </div>
    </main>
  )
}

async function DashboardContent({
  projectIdFilter,
  orgIdFilter,
}: {
  projectIdFilter?: string
  orgIdFilter?: string
}) {
  const { orgs, globalError } = await loadDashboardData({ projectIdFilter, orgIdFilter })

  return (
    <main className="mx-auto w-full max-w-7xl px-6 py-10">
      <section className="mb-8 flex flex-wrap items-end justify-between gap-5">
        <div>
          <h1 className="text-3xl font-bold text-white md:text-4xl">Performance Dashboard</h1>
          <p className="mt-2 text-sm text-gray-400">
            Unified Meta Ads campaign metrics across organizations and projects.
          </p>
        </div>
        {projectIdFilter && (
          <Link
            href="/dashboard"
            className="rounded-md border border-gray-700 bg-gray-900 px-4 py-2 text-sm font-medium text-gray-200 transition hover:border-gray-600 hover:bg-gray-800"
          >
            Clear Filter
          </Link>
        )}
      </section>

      {globalError && (
        <div className="mb-6 rounded-xl border border-rose-500/40 bg-rose-500/10 p-4 text-sm text-rose-300">
          {globalError}
        </div>
      )}

      {!globalError && orgs.length === 0 && (
        <div className="rounded-xl border border-dashed border-gray-700 bg-gray-900 p-10 text-center">
          <p className="mb-5 text-sm text-gray-300">
            {projectIdFilter
              ? "No dashboard data was found for this project filter."
              : "No organizations are available for this account yet."}
          </p>
          <Link
            href="/orgs"
            className="inline-flex rounded-md bg-indigo-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-400"
          >
            Go to Organizations
          </Link>
        </div>
      )}

      <div className="space-y-6">
        {orgs.map((org) => (
          <OrganizationSection key={org.id} org={org} />
        ))}
      </div>
    </main>
  )
}

export default function DashboardPage({
  searchParams,
}: {
  searchParams?: Record<string, string | string[] | undefined>
}) {
  const projectIdFilter = singleSearchParam(searchParams?.projectId)
  const orgIdFilter = singleSearchParam(searchParams?.orgId)

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <TopBar projectIdFilter={projectIdFilter} />
      <Suspense fallback={<DashboardLoadingState />}>
        <DashboardContent projectIdFilter={projectIdFilter} orgIdFilter={orgIdFilter} />
      </Suspense>
    </div>
  )
}
