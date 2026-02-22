"use client"
import { useEffect, useState } from "react"
import Link from "next/link"

interface Summary {
  totals: { spend: number; clicks: number; impressions: number; conversions: number; ctr: number; cpc: number }
  campaigns: { id: string; name: string; status: string; objective: string; dailyBudgetCents: number | null }[]
  experiments: { id: string; name: string; status: string; type: string; runs: { decision_json: Record<string, unknown> }[] }[]
  recentDecisions: { id: string; decisionType: string; createdAt: string; decision_json: Record<string, unknown> }[]
  activeCampaigns: number
  runningExperiments: number
}

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: "bg-green-100 text-green-700", PAUSED: "bg-yellow-100 text-yellow-700",
  RUNNING: "bg-blue-100 text-blue-700", COMPLETED: "bg-gray-100 text-gray-600",
  PLANNED: "bg-purple-100 text-purple-700", STOPPED: "bg-red-100 text-red-700",
}
const DECISION_ICONS: Record<string, string> = { SCALE: "↑", KILL: "✕", STOP: "■", ITERATE: "→", WAIT: "…" }

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-white rounded-xl border p-5">
      <div className="text-xs text-gray-400 uppercase tracking-wide mb-1">{label}</div>
      <div className="text-2xl font-bold text-gray-900">{value}</div>
      {sub && <div className="text-xs text-gray-400 mt-1">{sub}</div>}
    </div>
  )
}

function Badge({ status }: { status: string }) {
  return <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[status] ?? "bg-gray-100 text-gray-500"}`}>{status}</span>
}

function Nav({ projectId }: { projectId: string }) {
  return (
    <nav className="bg-white border-b">
      <div className="max-w-6xl mx-auto px-6 flex gap-6 h-12 items-center">
        <Link href="/projects" className="text-sm text-gray-400 hover:text-gray-700">← Projects</Link>
        <div className="w-px h-4 bg-gray-200" />
        {[["Dashboard", "dashboard"], ["Ads", "ads"], ["Experiments", "experiments"], ["Governance", "governance"]].map(([label, slug]) => (
          <Link key={slug} href={`/projects/${projectId}/${slug}`} className="text-sm text-gray-600 hover:text-gray-900">{label}</Link>
        ))}
      </div>
    </nav>
  )
}

function Empty({ message, href, linkLabel }: { message: string; href?: string; linkLabel?: string }) {
  return (
    <div className="bg-white border border-dashed rounded-lg px-4 py-6 text-center">
      <p className="text-sm text-gray-400 mb-3">{message}</p>
      {href && <Link href={href} className="text-sm text-blue-600 hover:underline">{linkLabel}</Link>}
    </div>
  )
}

export default function DashboardPage({ params }: { params: { id: string } }) {
  const [data, setData] = useState<Summary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showMetaBanner, setShowMetaBanner] = useState(false)

  useEffect(() => {
    fetch(`/api/projects/${params.id}/summary`)
      .then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json() })
      .then((d) => { setData(d); setLoading(false) })
      .catch((e) => { setError(e.message); setLoading(false) })
    fetch("/api/meta/ad-accounts").then((r) => r.json()).then((d) => { if (d.stub || d.reconnect) setShowMetaBanner(true) }).catch(() => setShowMetaBanner(true))
  }, [params.id])

  if (loading) return <div className="min-h-screen bg-gray-50"><Nav projectId={params.id} /><div className="max-w-6xl mx-auto px-6 py-8 animate-pulse"><div className="grid grid-cols-4 gap-4">{[1,2,3,4].map(i => <div key={i} className="bg-white rounded-xl border h-20" />)}</div></div></div>
  if (error || !data) return <div className="min-h-screen bg-gray-50"><Nav projectId={params.id} /><div className="max-w-6xl mx-auto px-6 py-8"><div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center"><p className="text-red-700">{error ?? "No data"}</p></div></div></div>

  return (
    <div className="min-h-screen bg-gray-50">
      <Nav projectId={params.id} />
      <main className="max-w-6xl mx-auto px-6 py-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Stat label="Spend 7d" value={`€${data.totals.spend.toFixed(2)}`} sub={`${data.activeCampaigns} active`} />
          <Stat label="Impressions 7d" value={data.totals.impressions.toLocaleString()} sub={`CTR ${data.totals.ctr.toFixed(2)}%`} />
          <Stat label="Clicks 7d" value={data.totals.clicks.toLocaleString()} sub={`CPC €${data.totals.cpc.toFixed(2)}`} />
          <Stat label="Experiments" value={String(data.runningExperiments)} sub="running" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <div className="flex justify-between items-center mb-3">
              <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Campaigns</h2>
              <Link href={`/projects/${params.id}/ads`} className="text-xs text-blue-600 hover:underline">Manage →</Link>
            </div>
            {data.campaigns.length === 0 ? <Empty message="No campaigns yet." href={`/projects/${params.id}/ads`} linkLabel="Create first campaign" /> : (
              <div className="space-y-2">
                {data.campaigns.map((c) => (
                  <div key={c.id} className="bg-white border rounded-lg px-4 py-3 flex items-center justify-between">
                    <div>
                      <div className="font-medium text-sm">{c.name}</div>
                      <div className="text-xs text-gray-400">{c.objective}{c.dailyBudgetCents ? ` · €${(c.dailyBudgetCents/100).toFixed(0)}/day` : ""}</div>
                    </div>
                    <Badge status={c.status} />
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="space-y-6">
            <div>
              <div className="flex justify-between items-center mb-3">
                <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Experiments</h2>
                <Link href={`/projects/${params.id}/experiments`} className="text-xs text-blue-600 hover:underline">View all →</Link>
              </div>
              {data.experiments.length === 0 ? <Empty message="No experiments yet." href={`/projects/${params.id}/experiments`} linkLabel="Start experiment" /> : (
                <div className="space-y-2">
                  {data.experiments.map((exp) => {
                    const d = exp.runs[0]?.decision_json as Record<string, unknown> | undefined
                    return (
                      <div key={exp.id} className="bg-white border rounded-lg px-4 py-3">
                        <div className="flex items-center justify-between mb-1">
                          <div className="font-medium text-sm truncate pr-2">{exp.name}</div>
                          <Badge status={exp.status} />
                        </div>
                        {d && <div className="text-xs text-gray-400">{DECISION_ICONS[d.action as string] ?? "·"} {String(d.action)} — {String(d.reason ?? "")}</div>}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
            <div>
              <div className="flex justify-between items-center mb-3">
                <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Decisions</h2>
                <Link href={`/projects/${params.id}/governance`} className="text-xs text-blue-600 hover:underline">Audit log →</Link>
              </div>
              {data.recentDecisions.length === 0 ? <Empty message="No decisions logged yet." /> : (
                <div className="space-y-2">
                  {data.recentDecisions.map((d) => (
                    <div key={d.id} className="bg-white border rounded-lg px-4 py-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">{DECISION_ICONS[d.decisionType] ?? "·"} {d.decisionType}</span>
                        <span className="text-xs text-gray-400">{new Date(d.createdAt).toLocaleDateString("nl-NL")}</span>
                      </div>
                      {(d.decision_json as Record<string, unknown>).reason && (
                        <div className="text-xs text-gray-400 mt-0.5">{String((d.decision_json as Record<string, unknown>).reason)}</div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
        {showMetaBanner && (
          <div className="mt-8 bg-yellow-50 border border-yellow-200 rounded-xl p-5 flex items-center justify-between">
            <div>
              <p className="font-medium text-yellow-800 text-sm">Meta not connected</p>
              <p className="text-yellow-600 text-xs mt-0.5">Connect your Meta account to pull live ad data.</p>
            </div>
            <Link href="/auth/signin" className="bg-yellow-500 text-white text-sm px-4 py-2 rounded-lg hover:bg-yellow-600 transition">Connect Meta →</Link>
          </div>
        )}
      </main>
    </div>
  )
}
