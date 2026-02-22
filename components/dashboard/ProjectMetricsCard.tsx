import Link from "next/link"
import CampaignPerformanceTable from "@/components/dashboard/CampaignPerformanceTable"

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

export default function ProjectMetricsCard({ project }: { project: DashboardProject }) {
  const totals = project.campaigns.reduce(
    (acc, campaign) => {
      acc.impressions += campaign.impressions
      acc.clicks += campaign.clicks
      acc.spend += campaign.spend
      return acc
    },
    { impressions: 0, clicks: 0, spend: 0 }
  )
  const totalCtr = totals.impressions > 0 ? (totals.clicks / totals.impressions) * 100 : 0

  return (
    <article className="rounded-xl border border-gray-800 bg-gray-900 p-6 shadow-[0_0_0_1px_rgba(255,255,255,0.01)]">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-white">{project.name}</h3>
          <p className="mt-1 text-xs text-gray-400">
            {project.metaAdAccountId
              ? `Meta Account: ${project.metaAdAccountId}`
              : "No Meta Ad Account linked"}
          </p>
        </div>
        <Link
          href={`/projects/${project.id}/dashboard`}
          className="rounded-md border border-gray-700 bg-gray-950 px-3 py-2 text-xs font-medium text-gray-200 transition hover:border-gray-600 hover:bg-gray-800"
        >
          View Project
        </Link>
      </div>

      {project.metaAdAccountId && project.campaigns.length > 0 && (
        <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-4">
          <div className="rounded-lg border border-gray-800 bg-gray-950 px-4 py-3">
            <p className="text-xs uppercase tracking-wide text-gray-400">Impressions</p>
            <p className="mt-1 text-2xl font-bold text-white tabular-nums">
              {totals.impressions.toLocaleString("en-US")}
            </p>
          </div>
          <div className="rounded-lg border border-gray-800 bg-gray-950 px-4 py-3">
            <p className="text-xs uppercase tracking-wide text-gray-400">Clicks</p>
            <p className="mt-1 text-2xl font-bold text-emerald-300 tabular-nums">
              {totals.clicks.toLocaleString("en-US")}
            </p>
          </div>
          <div className="rounded-lg border border-gray-800 bg-gray-950 px-4 py-3">
            <p className="text-xs uppercase tracking-wide text-gray-400">Spend</p>
            <p className="mt-1 text-2xl font-bold text-rose-300 tabular-nums">
              {new Intl.NumberFormat("en-US", {
                style: "currency",
                currency: "USD",
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              }).format(totals.spend)}
            </p>
          </div>
          <div className="rounded-lg border border-gray-800 bg-gray-950 px-4 py-3">
            <p className="text-xs uppercase tracking-wide text-gray-400">CTR</p>
            <p
              className={`mt-1 text-2xl font-bold tabular-nums ${
                totalCtr >= 1 ? "text-emerald-300" : "text-rose-300"
              }`}
            >
              {totalCtr.toFixed(2)}%
            </p>
          </div>
        </div>
      )}

      {!project.metaAdAccountId && (
        <div className="rounded-lg border border-dashed border-gray-700 bg-gray-950 p-5 text-sm text-gray-300">
          <p className="mb-4">
            Link a Meta Ad Account to unlock campaign-level performance metrics.
          </p>
          <Link
            href={`/projects/${project.id}/dashboard`}
            className="inline-flex rounded-md bg-indigo-500 px-3 py-2 text-xs font-semibold text-white transition hover:bg-indigo-400"
          >
            Open Project Setup
          </Link>
        </div>
      )}

      {project.error && (
        <div className="rounded-lg border border-rose-500/40 bg-rose-500/10 p-3 text-sm text-rose-300">
          {project.error}
        </div>
      )}

      {project.metaAdAccountId && !project.error && project.campaigns.length === 0 && (
        <div className="rounded-lg border border-dashed border-gray-700 bg-gray-950 p-5 text-sm text-gray-300">
          <p className="mb-4">No campaigns found for this project yet.</p>
          <Link
            href={`/projects/${project.id}/ads`}
            className="inline-flex rounded-md bg-indigo-500 px-3 py-2 text-xs font-semibold text-white transition hover:bg-indigo-400"
          >
            Create Campaign
          </Link>
        </div>
      )}

      {project.metaAdAccountId && !project.error && project.campaigns.length > 0 && (
        <CampaignPerformanceTable campaigns={project.campaigns} />
      )}
    </article>
  )
}
