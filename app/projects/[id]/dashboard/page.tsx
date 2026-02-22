"use client"
import { useEffect, useState } from "react"
import Link from "next/link"
import { ProjectNav } from "@/components/ProjectNav"

interface Summary {
  totals: { spend: number; clicks: number; impressions: number; conversions: number; ctr: number; cpc: number }
  campaigns: { id: string; name: string; status: string; objective: string; dailyBudgetCents: number | null }[]
  experiments: { id: string; name: string; status: string; type: string; runs: { decision_json: Record<string, unknown> }[] }[]
  recentDecisions: { id: string; decisionType: string; createdAt: string; decision_json: Record<string, unknown> }[]
  activeCampaigns: number
  runningExperiments: number
}

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: "bg-green-900 text-green-400", PAUSED: "bg-yellow-900 text-yellow-400",
  RUNNING: "bg-blue-900 text-blue-400", COMPLETED: "bg-gray-700 text-gray-400",
  PLANNED: "bg-purple-900 text-purple-400", STOPPED: "bg-red-900 text-red-400",
}
const DECISION_ICONS: Record<string, string> = { SCALE: "↑", KILL: "✕", STOP: "■", ITERATE: "→", WAIT: "…" }

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-gray-900 rounded-xl border border-gray-800 p-5">
      <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">{label}</div>
      <div className="text-2xl font-bold text-white">{value}</div>
      {sub && <div className="text-xs text-gray-500 mt-1">{sub}</div>}
    </div>
  )
}

function Badge({ status }: { status: string }) {
  return <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[status] ?? "bg-gray-700 text-gray-400"}`}>{status}</span>
}

function Nav({ projectId }: { projectId: string }) {
  return <ProjectNav projectId={projectId} />
}

function Empty({ message, href, linkLabel }: { message: string; href?: string; linkLabel?: string }) {
  return (
    <div className="bg-gray-900 border border-gray-800 border-dashed rounded-lg px-4 py-6 text-center">
      <p className="text-sm text-gray-500 mb-3">{message}</p>
      {href && <Link href={href} className="text-sm text-blue-400 hover:underline">{linkLabel}</Link>}
    </div>
  )
}

export default function DashboardPage({ params }: { params: { id: string } }) {
  const [data, setData] = useState<Summary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showMetaBanner, setShowMetaBanner] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [syncMsg, setSyncMsg] = useState("")

  const loadSummary = () =>
    fetch(`/api/projects/${params.id}/summary`)
      .then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json() })
      .then((d) => { setData(d); setLoading(false) })
      .catch((e) => { setError(e.message); setLoading(false) })

  useEffect(() => {
    loadSummary()
    fetch("/api/meta/ad-accounts").then((r) => r.json()).then((d) => { if (d.stub || d.reconnect) setShowMetaBanner(true) }).catch(() => setShowMetaBanner(true))
  }, [params.id])

  const syncInsights = async () => {
    setSyncing(true)
    setSyncMsg("")
    try {
      const res = await fetch("/api/meta/sync-insights", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId: params.id }),
      })
      const d = await res.json()
      setSyncMsg(d.message ?? `Synced ${d.stored ?? 0} rows`)
      await loadSummary()
    } catch {
      setSyncMsg("Sync failed")
    }
    setSyncing(false)
  }

  if (loading) return (
    <div className="min-h-screen bg-gray-950">
      <Nav projectId={params.id} />
      <div className="max-w-6xl mx-auto px-6 py-8 animate-pulse">
        <div className="grid grid-cols-4 gap-4">{[1,2,3,4].map(i => <div key={i} className="bg-gray-900 rounded-xl border border-gray-800 h-20" />)}</div>
      </div>
    </div>
  )

  if (error || !data) return (
    <div className="min-h-screen bg-gray-950">
      <Nav projectId={params.id} />
      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="bg-red-950 border border-red-800 rounded-xl p-6 text-center">
          <p className="text-red-400">{error ?? "No data"}</p>
        </div>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-950">
      <Nav projectId={params.id} />
      <main className="max-w-6xl mx-auto px-6 py-8">
        <div className="flex justify-between items-center mb-6">
          <div />
          <div className="flex items-center gap-3">
            {syncMsg && <span className="text-xs text-gray-500">{syncMsg}</span>}
            <button
              onClick={syncInsights}
              disabled={syncing}
              className="text-sm px-4 py-2 rounded-lg bg-gray-800 text-gray-300 hover:bg-gray-700 disabled:opacity-50 transition"
            >
              {syncing ? "Syncing…" : "↻ Sync Meta"}
            </button>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Stat label="Spend 7d" value={`€${data.totals.spend.toFixed(2)}`} sub={`${data.activeCampaigns} active`} />
          <Stat label="Impressions 7d" value={data.totals.impressions.toLocaleString()} sub={`CTR ${data.totals.ctr.toFixed(2)}%`} />
          <Stat label="Clicks 7d" value={data.totals.clicks.toLocaleString()} sub={`CPC €${data.totals.cpc.toFixed(2)}`} />
          <Stat label="Experiments" value={String(data.runningExperiments)} sub="running" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <div className="flex justify-between items-center mb-3">
              <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Campaigns</h2>
              <Link href={`/projects/${params.id}/ads`} className="text-xs text-blue-400 hover:underline">Manage →</Link>
            </div>
            {data.campaigns.length === 0 ? <Empty message="No campaigns yet." href={`/projects/${params.id}/ads`} linkLabel="Create first campaign" /> : (
              <div className="space-y-2">
                {data.campaigns.map((c) => (
                  <div key={c.id} className="bg-gray-900 border border-gray-800 rounded-lg px-4 py-3 flex items-center justify-between">
                    <div>
                      <div className="font-medium text-sm text-gray-200">{c.name}</div>
                      <div className="text-xs text-gray-500">{c.objective}{c.dailyBudgetCents ? ` · €${(c.dailyBudgetCents/100).toFixed(0)}/day` : ""}</div>
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
                <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Experiments</h2>
                <Link href={`/projects/${params.id}/experiments`} className="text-xs text-blue-400 hover:underline">View all →</Link>
              </div>
              {data.experiments.length === 0 ? <Empty message="No experiments yet." href={`/projects/${params.id}/experiments`} linkLabel="Start experiment" /> : (
                <div className="space-y-2">
                  {data.experiments.map((exp) => {
                    const d = exp.runs[0]?.decision_json as Record<string, unknown> | undefined
                    return (
                      <div key={exp.id} className="bg-gray-900 border border-gray-800 rounded-lg px-4 py-3">
                        <div className="flex items-center justify-between mb-1">
                          <div className="font-medium text-sm text-gray-200 truncate pr-2">{exp.name}</div>
                          <Badge status={exp.status} />
                        </div>
                        {d && <div className="text-xs text-gray-500">{DECISION_ICONS[d.action as string] ?? "·"} {String(d.action)} — {String(d.reason ?? "")}</div>}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
            <div>
              <div className="flex justify-between items-center mb-3">
                <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Decisions</h2>
                <Link href={`/projects/${params.id}/governance`} className="text-xs text-blue-400 hover:underline">Audit log →</Link>
              </div>
              {data.recentDecisions.length === 0 ? <Empty message="No decisions logged yet." /> : (
                <div className="space-y-2">
                  {data.recentDecisions.map((d) => (
                    <div key={d.id} className="bg-gray-900 border border-gray-800 rounded-lg px-4 py-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-200">{DECISION_ICONS[d.decisionType] ?? "·"} {d.decisionType}</span>
                        <span className="text-xs text-gray-500">{new Date(d.createdAt).toLocaleDateString("nl-NL")}</span>
                      </div>
                      {(d.decision_json as Record<string, unknown>).reason && (
                        <div className="text-xs text-gray-500 mt-0.5">{String((d.decision_json as Record<string, unknown>).reason)}</div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
        {showMetaBanner && (
          <div className="mt-8 bg-yellow-950 border border-yellow-800 rounded-xl p-5 flex items-center justify-between">
            <div>
              <p className="font-medium text-yellow-400 text-sm">Meta not connected</p>
              <p className="text-yellow-600 text-xs mt-0.5">Connect your Meta account to pull live ad data.</p>
            </div>
            <Link href={`/projects/${params.id}/settings`} className="bg-yellow-600 hover:bg-yellow-500 text-white text-sm px-4 py-2 rounded-lg transition">Connect Meta →</Link>
          </div>
        )}
      </main>
    </div>
  )
}
