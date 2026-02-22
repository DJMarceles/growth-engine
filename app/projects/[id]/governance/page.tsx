"use client"
import { useState, useEffect } from "react"
import { ProjectNav } from "@/components/ProjectNav"

interface Decision { id: string; decisionType: string; createdAt: string; promptHash?: string; decision_json: Record<string, unknown> }
interface Snapshot { id: string; source: string; createdAt: string }

function Nav({ projectId }: { projectId: string }) {
  return <ProjectNav projectId={projectId} />
}

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
    <div className="min-h-screen bg-gray-950">
      <Nav projectId={projectId} />
      <main className="max-w-4xl mx-auto px-6 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-white">Governance</h1>
          <button
            className="bg-gray-800 hover:bg-gray-700 text-gray-200 px-4 py-2 rounded-lg text-sm transition"
            onClick={exportJson}
          >
            Export JSON
          </button>
        </div>
        <section className="mb-8">
          <h2 className="font-semibold text-gray-300 mb-3">Decisions</h2>
          <div className="space-y-2">
            {decisions.map((d) => (
              <div key={d.id} className="bg-gray-900 border border-gray-800 rounded-lg p-3">
                <div className="flex justify-between">
                  <span className="font-medium text-gray-200">{d.decisionType}</span>
                  <span className="text-xs text-gray-500">{new Date(d.createdAt).toLocaleString("nl-NL")}</span>
                </div>
                {d.promptHash && <div className="text-xs text-gray-500 font-mono mt-1">hash: {d.promptHash.slice(0,16)}...</div>}
                <pre className="text-xs bg-gray-800 text-gray-400 rounded p-2 mt-2 overflow-auto max-h-24">{JSON.stringify(d.decision_json, null, 2)}</pre>
              </div>
            ))}
            {decisions.length === 0 && <p className="text-gray-500 text-sm">No decisions logged yet.</p>}
          </div>
        </section>
        <section>
          <h2 className="font-semibold text-gray-300 mb-3">Evidence Snapshots</h2>
          <div className="space-y-2">
            {snapshots.map((s) => (
              <div key={s.id} className="bg-gray-900 border border-gray-800 rounded-lg p-3 flex justify-between">
                <span className="text-sm text-gray-300">{s.source}</span>
                <span className="text-xs text-gray-500">{new Date(s.createdAt).toLocaleString("nl-NL")}</span>
              </div>
            ))}
            {snapshots.length === 0 && <p className="text-gray-500 text-sm">No snapshots yet.</p>}
          </div>
        </section>
      </main>
    </div>
  )
}
