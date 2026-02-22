"use client"
import { useState, useEffect } from "react"
import { ProjectNav } from "@/components/ProjectNav"

interface Campaign { id: string; name: string; status: string; objective: string; metaCampaignId: string; dailyBudgetCents: number | null }

function Nav({ projectId }: { projectId: string }) {
  return <ProjectNav projectId={projectId} />
}

export default function AdsPage({ params }: { params: { id: string } }) {
  const projectId = params.id
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [form, setForm] = useState({ name: "", objective: "LINK_CLICKS", dailyBudgetCents: 1000 })
  const [syncing, setSyncing] = useState(false)
  const [syncMsg, setSyncMsg] = useState("")
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState("")

  const load = () => fetch(`/api/ads/campaigns/list?projectId=${projectId}`).then((r) => r.json()).then((d) => setCampaigns(d.campaigns ?? []))
  useEffect(() => { load() }, [])

  const create = async () => {
    if (!form.name.trim()) { setCreateError("Campaign name is required"); return }
    setCreating(true)
    setCreateError("")
    try {
      const res = await fetch("/api/ads/campaigns/create", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, ...form }),
      })
      const d = await res.json()
      if (!res.ok) {
        setCreateError(d.error ?? `Error ${res.status}`)
      } else {
        setForm({ name: "", objective: "LINK_CLICKS", dailyBudgetCents: 1000 })
        if (d.warning) setCreateError(`⚠️ ${d.warning}`)
        load()
      }
    } catch (e) {
      setCreateError(e instanceof Error ? e.message : "Unknown error")
    }
    setCreating(false)
  }

  const toggle = async (id: string, current: string) => {
    await fetch(`/api/ads/campaigns/${id}/${current === "ACTIVE" ? "pause" : "resume"}`, { method: "POST" })
    load()
  }

  const syncInsights = async () => {
    setSyncing(true)
    setSyncMsg("")
    try {
      const res = await fetch("/api/meta/sync-insights", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId }),
      })
      const d = await res.json()
      setSyncMsg(d.message ?? `Synced ${d.stored ?? 0} rows`)
    } catch {
      setSyncMsg("Sync failed")
    }
    setSyncing(false)
  }

  const STATUS_COLORS: Record<string, string> = {
    ACTIVE: "bg-green-900 text-green-400",
    PAUSED: "bg-yellow-900 text-yellow-400",
    ARCHIVED: "bg-gray-700 text-gray-400",
  }

  return (
    <div className="min-h-screen bg-gray-950">
      <Nav projectId={projectId} />
      <main className="max-w-4xl mx-auto px-6 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-white">Ads Manager</h1>
          <button
            onClick={syncInsights}
            disabled={syncing}
            className="text-sm px-4 py-2 rounded-lg bg-gray-800 text-gray-300 hover:bg-gray-700 disabled:opacity-50 transition"
          >
            {syncing ? "Syncing…" : "↻ Sync Meta Insights"}
          </button>
        </div>
        {syncMsg && <p className="text-xs text-gray-400 mb-4">{syncMsg}</p>}
        <section className="mb-8 p-4 bg-gray-900 border border-gray-800 rounded-xl">
          <h2 className="font-semibold text-gray-200 mb-3">Create Campaign</h2>
          <div className="flex gap-2 flex-wrap">
            <input
              className="bg-gray-800 border border-gray-700 text-gray-200 rounded px-3 py-2 placeholder-gray-600"
              placeholder="Campaign name" value={form.name}
              onChange={(e) => setForm({...form, name: e.target.value})}
            />
            <select
              className="bg-gray-800 border border-gray-700 text-gray-200 rounded px-3 py-2"
              value={form.objective} onChange={(e) => setForm({...form, objective: e.target.value})}
            >
              <option value="LINK_CLICKS">Link Clicks</option>
              <option value="CONVERSIONS">Conversions</option>
              <option value="REACH">Reach</option>
              <option value="BRAND_AWARENESS">Brand Awareness</option>
            </select>
            <input
              type="number"
              className="bg-gray-800 border border-gray-700 text-gray-200 rounded px-3 py-2 w-40"
              placeholder="Daily budget (cents)"
              value={form.dailyBudgetCents}
              onChange={(e) => setForm({...form, dailyBudgetCents: Number(e.target.value)})}
            />
            <button
              className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white px-4 py-2 rounded transition"
              onClick={create}
              disabled={creating}
            >
              {creating ? "Creating…" : "Create"}
            </button>
          </div>
          {createError && (
            <div className="mt-3 p-3 bg-red-950 border border-red-800 rounded-lg text-sm text-red-400">
              {createError}
            </div>
          )}
        </section>
        <div className="space-y-2">
          {campaigns.map((c) => (
            <div key={c.id} className="bg-gray-900 border border-gray-800 rounded-lg px-4 py-3 flex items-center justify-between">
              <div>
                <div className="font-medium text-gray-200">{c.name}</div>
                <div className="text-xs text-gray-500 mt-0.5">{c.objective} · {c.metaCampaignId}{c.dailyBudgetCents ? ` · €${(c.dailyBudgetCents/100).toFixed(0)}/day` : ""}</div>
              </div>
              <div className="flex items-center gap-3">
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[c.status] ?? "bg-gray-700 text-gray-400"}`}>{c.status}</span>
                <button
                  onClick={() => toggle(c.id, c.status)}
                  className={`px-3 py-1 rounded text-xs ${c.status === "ACTIVE" ? "bg-red-900 text-red-400 hover:bg-red-800" : "bg-green-900 text-green-400 hover:bg-green-800"}`}
                >
                  {c.status === "ACTIVE" ? "Pause" : "Resume"}
                </button>
              </div>
            </div>
          ))}
          {campaigns.length === 0 && <p className="text-gray-500 text-sm">No campaigns yet.</p>}
        </div>
      </main>
    </div>
  )
}
