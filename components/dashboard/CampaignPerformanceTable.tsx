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

function formatMetric(value: number) {
  return value.toLocaleString("en-US")
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

function statusClass(status: string) {
  if (status === "ACTIVE") return "bg-emerald-500/10 text-emerald-300 ring-1 ring-emerald-500/30"
  if (status === "PAUSED") return "bg-amber-500/10 text-amber-300 ring-1 ring-amber-500/30"
  return "bg-gray-800 text-gray-300 ring-1 ring-gray-700"
}

export default function CampaignPerformanceTable({
  campaigns,
}: {
  campaigns: CampaignMetric[]
}) {
  return (
    <div className="overflow-x-auto rounded-xl border border-gray-800">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="border-b border-gray-800 bg-gray-950 text-left text-xs uppercase tracking-wide text-gray-400">
            <th className="px-4 py-3 font-semibold">Campaign</th>
            <th className="px-4 py-3 font-semibold">Status</th>
            <th className="px-4 py-3 text-right font-semibold">Impressions</th>
            <th className="px-4 py-3 text-right font-semibold">Clicks</th>
            <th className="px-4 py-3 text-right font-semibold">Spend</th>
            <th className="px-4 py-3 text-right font-semibold">CTR</th>
          </tr>
        </thead>
        <tbody>
          {campaigns.map((campaign, index) => (
            <tr
              key={campaign.id}
              className={`border-b border-gray-800 text-gray-200 transition-colors hover:bg-gray-800/60 ${
                index % 2 === 0 ? "bg-gray-900" : "bg-gray-900/70"
              }`}
            >
              <td className="px-4 py-3">
                <div className="font-medium text-white">{campaign.name}</div>
                <div className="text-xs text-gray-400">{campaign.objective}</div>
              </td>
              <td className="px-4 py-3">
                <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${statusClass(campaign.status)}`}>
                  {campaign.status}
                </span>
              </td>
              <td className="px-4 py-3 text-right font-medium tabular-nums">{formatMetric(campaign.impressions)}</td>
              <td className="px-4 py-3 text-right font-medium tabular-nums">{formatMetric(campaign.clicks)}</td>
              <td className="px-4 py-3 text-right font-medium text-rose-300 tabular-nums">{formatCurrency(campaign.spend)}</td>
              <td
                className={`px-4 py-3 text-right font-semibold tabular-nums ${
                  campaign.ctr >= 1 ? "text-emerald-300" : "text-rose-300"
                }`}
              >
                {campaign.ctr.toFixed(2)}%
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
