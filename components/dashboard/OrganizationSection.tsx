import Link from "next/link"
import ProjectMetricsCard from "@/components/dashboard/ProjectMetricsCard"

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

export default function OrganizationSection({ org }: { org: DashboardOrg }) {
  return (
    <section className="rounded-xl border border-gray-800 bg-gray-900 p-6">
      <header className="mb-6 border-b border-gray-800 pb-4">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-xl font-semibold text-white">{org.name}</h2>
          <span className="rounded-full border border-gray-700 bg-gray-950 px-2.5 py-1 text-xs font-semibold tracking-wide text-gray-300">
            {org.type}
          </span>
          <span className="rounded-full border border-indigo-500/30 bg-indigo-500/10 px-2.5 py-1 text-xs font-semibold tracking-wide text-indigo-300">
            {org.role}
          </span>
        </div>
      </header>

      {org.projectError && (
        <div className="rounded-lg border border-rose-500/40 bg-rose-500/10 p-4 text-sm text-rose-300">
          {org.projectError}
        </div>
      )}

      {!org.projectError && org.projects.length === 0 && (
        <div className="rounded-lg border border-dashed border-gray-700 bg-gray-950 p-6 text-sm text-gray-300">
          <p className="mb-4">No projects found for this organization.</p>
          <Link
            href="/projects/new"
            className="inline-flex rounded-md bg-indigo-500 px-3 py-2 text-xs font-semibold text-white transition hover:bg-indigo-400"
          >
            Create Project
          </Link>
        </div>
      )}

      {!org.projectError && org.projects.length > 0 && (
        <div className="space-y-4">
          {org.projects.map((project) => (
            <ProjectMetricsCard key={project.id} project={project} />
          ))}
        </div>
      )}
    </section>
  )
}
