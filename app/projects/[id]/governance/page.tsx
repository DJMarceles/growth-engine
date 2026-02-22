"use client"
import { useState, useEffect } from "react"
import Link from "next/link"

interface Decision { id: string; decisionType: string; createdAt: string; promptHash?: string; decision_json: Record<string, unknown> }
interface Snapshot { id: string; source: string; createdAt: string }

export default function GovernancePage({ params }: { params: { id: string } }) {
  const projectId = params.id
  const [decisions, setDecisions] = useState<Decision[]>([])
  const [snapshots, setSnapshots] = useState<Snapshot[]>([])

  useEffect(() => {
    fetch(`/api/decisions/${projectId}/list`).then((r) => r.json()).then((d) => setDecisions(d.decisions ?? []))
    fetch(`/api/evidence/list?projectId=${projectId}`).then((r) => r.json()).then((d) => setSnapshots(d.snapshots ?? []))
  }, [projectId])

  const exportJson = async () => {
    const res = await fetch(`/api/governance/${projectId}/export`)
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url; a.download = `governance-${projectId}.json`; a.click()
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
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Governance</h1>
          <button className="bg-gray-800 text-white px-4 py-2 rounded text-sm" onClick={exportJson}>Export JSON</button>
        </div>
        <section className="mb-8">
          <h2 className="font-semibold mb-3">Decisions</h2>
          <div className="space-y-2">
            {decisions.map((d) => (
              <div key={d.id} className="bg-white border rounded p-3">
                <div className="flex justify-between">
                  <span className="font-medium">{d.decisionType}</span>
                  <span className="text-xs text-gray-400">{new Date(d.createdAt).toLocaleString("nl-NL")}</span>
                </div>
                {d.promptHash && <div className="text-xs text-gray-400 font-mono mt-1">hash: {d.promptHash.slice(0,16)}...</div>}
                <pre className="text-xs bg-gray-50 rounded p-2 mt-2 overflow-auto max-h-24">{JSON.stringify(d.decision_json, null, 2)}</pre>
              </div>
            ))}
            {decisions.length === 0 && <p className="text-gray-400 text-sm">No decisions logged yet.</p>}
          </div>
        </section>
        <section>
          <h2 className="font-semibold mb-3">Evidence Snapshots</h2>
          <div className="space-y-2">
            {snapshots.map((s) => (
              <div key={s.id} className="bg-white border rounded p-3 flex justify-between">
                <span className="text-sm">{s.source}</span>
                <span className="text-xs text-gray-400">{new Date(s.createdAt).toLocaleString("nl-NL")}</span>
              </div>
            ))}
            {snapshots.length === 0 && <p className="text-gray-400 text-sm">No snapshots yet.</p>}
          </div>
        </section>
      </main>
    </div>
  )
}
