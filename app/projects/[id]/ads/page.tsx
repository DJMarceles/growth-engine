"use client"
import { useState, useEffect } from "react"
import Link from "next/link"

interface Campaign { id: string; name: string; status: string; objective: string; metaCampaignId: string; dailyBudgetCents: number | null }

export default function AdsPage({ params }: { params: { id: string } }) {
  const projectId = params.id
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [form, setForm] = useState({ name: "", objective: "LINK_CLICKS", dailyBudgetCents: 1000 })

  const load = () => fetch(`/api/ads/campaigns/list?projectId=${projectId}`).then((r) => r.json()).then((d) => setCampaigns(d.campaigns ?? []))
  useEffect(() => { load() }, [])

  const create = async () => {
    await fetch("/api/ads/campaigns/create", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId, ...form }),
    })
    load()
  }

  const toggle = async (id: string, current: string) => {
    await fetch(`/api/ads/campaigns/${id}/${current === "ACTIVE" ? "pause" : "resume"}`, { method: "POST" })
    load()
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b">
        <div className="max-w-6xl mx-auto px-6 flex gap-6 h-12 items-center">
          <Link href="/projects" className="text-sm text-gray-400">← Projects</Link>
          <div className="w-px h-4 bg-gray-200" />
          {[["Dashboard","dashboard"],["Ads","ads"],["Experiments","experiments"],["Governance","governance"]].map(([l,s]) => (
            <Link key={s} href={`/projects/${projectId}/${s}`} className="text-sm text-gray-600 hover:text-gray-900">{l}</Link>
          ))}
        </div>
      </nav>
      <main className="max-w-4xl mx-auto px-6 py-8">
        <h1 className="text-2xl font-bold mb-6">Ads Manager</h1>
        <section className="mb-8 p-4 bg-white border rounded-xl">
          <h2 className="font-semibold mb-3">Create Campaign</h2>
          <div className="flex gap-2 flex-wrap">
            <input className="border rounded px-3 py-2" placeholder="Campaign name" value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} />
            <select className="border rounded px-3 py-2" value={form.objective} onChange={(e) => setForm({...form, objective: e.target.value})}>
              <option value="LINK_CLICKS">Link Clicks</option>
              <option value="CONVERSIONS">Conversions</option>
              <option value="REACH">Reach</option>
              <option value="BRAND_AWARENESS">Brand Awareness</option>
            </select>
            <input type="number" className="border rounded px-3 py-2 w-40" placeholder="Daily budget (cents)"
              value={form.dailyBudgetCents} onChange={(e) => setForm({...form, dailyBudgetCents: Number(e.target.value)})} />
            <button className="bg-blue-600 text-white px-4 py-2 rounded" onClick={create}>Create</button>
          </div>
        </section>
        <div className="space-y-2">
          {campaigns.map((c) => (
            <div key={c.id} className="bg-white border rounded-lg px-4 py-3 flex items-center justify-between">
              <div>
                <div className="font-medium">{c.name}</div>
                <div className="text-xs text-gray-400">{c.objective} · Meta: {c.metaCampaignId}</div>
              </div>
              <button onClick={() => toggle(c.id, c.status)}
                className={`px-3 py-1 rounded text-sm ${c.status === "ACTIVE" ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"}`}>
                {c.status === "ACTIVE" ? "Pause" : "Resume"}
              </button>
            </div>
          ))}
          {campaigns.length === 0 && <p className="text-gray-400 text-sm">No campaigns yet.</p>}
        </div>
      </main>
    </div>
  )
}
