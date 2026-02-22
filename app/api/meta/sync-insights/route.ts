import { NextRequest, NextResponse } from "next/server"
import { requireProjectAccess } from "@/lib/rbac"
import prisma from "@/lib/prisma"
import { getMetaToken } from "@/lib/getMetaToken"
import { fetchInsights } from "@/lib/metaAds"

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { projectId } = body

  if (!projectId) return NextResponse.json({ error: "projectId required" }, { status: 400 })

  const access = await requireProjectAccess(projectId)
  if ("status" in access) return access

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: { metaAdAccount: true },
  })

  if (!project?.metaAdAccountId) {
    return NextResponse.json({ error: "No Meta ad account linked to this project" }, { status: 400 })
  }

  const tokenResult = await getMetaToken()
  if ("status" in tokenResult) return tokenResult

  // Fetch last 7 days
  const until = new Date()
  const since = new Date()
  since.setDate(until.getDate() - 7)

  const fmt = (d: Date) => d.toISOString().split("T")[0]
  const dateRange = { since: fmt(since), until: fmt(until) }

  // Get all campaigns for this project
  const campaigns = await prisma.adCampaign.findMany({ where: { projectId } })

  if (campaigns.length === 0) {
    return NextResponse.json({ stored: 0, message: "No campaigns found — create a campaign first" })
  }

  let totalStored = 0
  const errors: string[] = []

  for (const campaign of campaigns) {
    try {
      const insights = await fetchInsights(
        tokenResult.token,
        campaign.metaCampaignId,
        "campaign",
        dateRange
      )

      for (const row of insights as Record<string, unknown>[]) {
        const date = new Date(row.date_start as string)
        await prisma.insightDaily.upsert({
          where: {
            projectId_date_level_entityId: {
              projectId,
              date,
              level: "campaign",
              entityId: campaign.metaCampaignId,
            },
          },
          update: { metrics_json: row as object },
          create: {
            projectId,
            date,
            level: "campaign",
            entityId: campaign.metaCampaignId,
            metrics_json: row as object,
          },
        })
        totalStored++
      }
    } catch (err) {
      errors.push(`Campaign ${campaign.name}: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  const message = errors.length > 0
    ? `Synced ${totalStored} rows. Errors: ${errors.join("; ")}`
    : `Synced ${totalStored} rows across ${campaigns.length} campaign(s)`

  return NextResponse.json({ stored: totalStored, message })
}
