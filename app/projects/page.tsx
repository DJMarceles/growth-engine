"use client"
import { useEffect, useState } from "react"
import OrgSwitcher from "@/components/OrgSwitcher"
import { GlobalNav } from "@/components/GlobalNav"

interface Project {
  id: string
  name: string
  metaAdAccountId: string | null
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [activeOrgId, setActiveOrgId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadProjects = async (orgId: string) => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch(`/api/projects/list?orgId=${orgId}`)
      const data = await response.json()
      setProjects(data.projects ?? [])
    } catch {
      setError("Unable to load projects.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const orgId = localStorage.getItem("activeOrgId")
    setActiveOrgId(orgId)
    if (!orgId) {
      setLoading(false)
      return
    }
    loadProjects(orgId)
  }, [])

  const connectedProjects = projects.filter((project) => project.metaAdAccountId).length

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <GlobalNav activePage="projects">
        <div className="[&_select]:rounded-md [&_select]:border [&_select]:border-gray-700 [&_select]:bg-gray-900 [&_select]:px-3 [&_select]:py-2 [&_select]:text-sm [&_select]:text-gray-200 [&_select]:outline-none [&_select]:transition [&_select]:focus:border-indigo-500 [&_select]:focus:ring-1 [&_select]:focus:ring-indigo-500/40">
          <OrgSwitcher />
        </div>
      </GlobalNav>

      <main className="mx-auto w-full max-w-7xl px-6 py-10">
        <section className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white md:text-4xl">Projects</h1>
            <p className="mt-2 text-sm text-gray-400">
              Manage projects and monitor Meta Ads connectivity across your active organization.
            </p>
          </div>
          <Link
            href="/projects/new"
            className="rounded-lg bg-indigo-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-400"
          >
            New Project
          </Link>
        </section>

        {!loading && !activeOrgId && (
          <section className="rounded-xl border border-dashed border-gray-700 bg-gray-900 p-10 text-center">
            <p className="mb-4 text-sm text-gray-300">
              No active organization selected. Choose one to view and manage projects.
            </p>
            <Link
              href="/orgs"
              className="inline-flex rounded-md bg-indigo-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-400"
            >
              Go to Organizations
            </Link>
          </section>
        )}

        {activeOrgId && (
          <>
            <section className="mb-6 grid gap-4 md:grid-cols-3">
              <div className="rounded-xl border border-gray-800 bg-gray-900 px-5 py-4">
                <p className="text-xs uppercase tracking-wide text-gray-400">Total Projects</p>
                <p className="mt-1 text-3xl font-bold text-white tabular-nums">{projects.length}</p>
              </div>
              <div className="rounded-xl border border-gray-800 bg-gray-900 px-5 py-4">
                <p className="text-xs uppercase tracking-wide text-gray-400">Meta Connected</p>
                <p className="mt-1 text-3xl font-bold text-emerald-300 tabular-nums">{connectedProjects}</p>
              </div>
              <div className="rounded-xl border border-gray-800 bg-gray-900 px-5 py-4">
                <p className="text-xs uppercase tracking-wide text-gray-400">Missing Connection</p>
                <p className="mt-1 text-3xl font-bold text-rose-300 tabular-nums">{projects.length - connectedProjects}</p>
              </div>
            </section>

            {error && (
              <div className="mb-6 rounded-xl border border-rose-500/40 bg-rose-500/10 p-4 text-sm text-rose-300">
                {error}
              </div>
            )}

            {loading && (
              <div className="space-y-3 animate-pulse">
                {[1, 2, 3, 4].map((item) => (
                  <div key={item} className="rounded-xl border border-gray-800 bg-gray-900 p-5">
                    <div className="h-5 w-56 rounded bg-gray-800" />
                    <div className="mt-3 h-4 w-40 rounded bg-gray-800" />
                  </div>
                ))}
              </div>
            )}

            {!loading && projects.length === 0 && (
              <section className="rounded-xl border border-dashed border-gray-700 bg-gray-900 p-10 text-center">
                <p className="mb-4 text-sm text-gray-300">No projects yet for this organization.</p>
                <Link
                  href="/projects/new"
                  className="inline-flex rounded-md bg-indigo-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-400"
                >
                  Create First Project
                </Link>
              </section>
            )}

            {!loading && projects.length > 0 && (
              <section className="space-y-3">
                {projects.map((project) => (
                  <Link
                    key={project.id}
                    href={activeOrgId ? `/orgs/${activeOrgId}/projects/${project.id}` : `/projects/${project.id}/dashboard`}
                    className="group block rounded-xl border border-gray-800 bg-gray-900 p-5 transition hover:border-indigo-400"
                  >
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-base font-semibold text-white">{project.name}</p>
                        <p className="mt-1 text-xs text-gray-400">
                          {project.metaAdAccountId ? "Meta account linked" : "Meta account not linked"}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                            project.metaAdAccountId
                              ? "bg-emerald-500/10 text-emerald-300 ring-1 ring-emerald-500/30"
                              : "bg-rose-500/10 text-rose-300 ring-1 ring-rose-500/30"
                          }`}
                        >
                          {project.metaAdAccountId ? "Connected" : "Disconnected"}
                        </span>
                        <span className="text-sm text-gray-500 transition group-hover:text-gray-200">Open →</span>
                      </div>
                    </div>
                  </Link>
                ))}
              </section>
            )}
          </>
        )}
      </main>
    </div>
  )
}
