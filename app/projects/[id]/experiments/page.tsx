"use client"
import { useState, useEffect } from "react"
import { ProjectNav } from "@/components/ProjectNav"

interface Experiment { id: string; name: string; status: string; type: string; hypothesis: string }

const DEFAULT_VARIANTS = JSON.stringify([
  { variant_id: "A", variant_type: "creative", payload_json: {}, allocation_percent: 50 },
  { variant_id: "B", variant_type: "creative", payload_json: {}, allocation_percent: 50 },
], null, 2)

const DEFAULT_RULES = JSON.stringify({
  primaryMetric: "CTR", minSpendCents: 5000, minImpressions: 500, maxDays: 14, winnerThresholdPercent: 20
}, null, 2)

function Nav({ projectId }: { projectId: string }) {
  return <ProjectNav projectId={projectId} />
}

const STATUS_COLORS: Record<string, string> = {
  RUNNING: "bg-blue-900 text-blue-400",
  PLANNED: "bg-purple-900 text-purple-400",
  COMPLETED: "bg-gray-700 text-gray-400",
  STOPPED: "bg-red-900 text-red-400",
}

export default function ExperimentsPage({ params }: { params: { id: string } }) {
  const projectId = params.id
  const [experiments, setExperiments] = useState<Experiment[]>([])
  const [form, setForm] = useState({ name: "", hypothesis: "", variants: DEFAULT_VARIANTS, rules: DEFAULT_RULES })

  const load = () => fetch(`/api/experiments/list?projectId=${projectId}`).then((r) => r.json()).then((d) => setExperiments(d.experiments ?? []))
  useEffect(() => { load() }, [])

  const create = async () => {
    await fetch("/api/experiments/create", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId, name: form.name, type: "creative", hypothesis: form.hypothesis, variants: JSON.parse(form.variants), decisionRules: JSON.parse(form.rules) }),
    })
    load()
  }

  const act = async (id: string, endpoint: string) => {
    await fetch(`/api/experiments/${id}/${endpoint}`, { method: "POST" })
    load()
  }

  return (
    <div className="min-h-screen bg-gray-950">
      <Nav projectId={projectId} />
      <main className="max-w-4xl mx-auto px-6 py-8">
        <h1 className="text-2xl font-bold text-white mb-6">Experiments</h1>
        <section className="mb-8 p-4 bg-gray-900 border border-gray-800 rounded-xl">
          <h2 className="font-semibold text-gray-200 mb-3">New Experiment</h2>
          <div className="space-y-2">
            <input
              className="bg-gray-800 border border-gray-700 text-gray-200 rounded px-3 py-2 w-full placeholder-gray-600"
              placeholder="Name" value={form.name}
              onChange={(e) => setForm({...form, name: e.target.value})}
            />
            <input
              className="bg-gray-800 border border-gray-700 text-gray-200 rounded px-3 py-2 w-full placeholder-gray-600"
              placeholder="Hypothesis" value={form.hypothesis}
              onChange={(e) => setForm({...form, hypothesis: e.target.value})}
            />
            <textarea
              className="bg-gray-800 border border-gray-700 text-gray-200 rounded px-3 py-2 w-full font-mono text-xs"
              rows={5} value={form.variants}
              onChange={(e) => setForm({...form, variants: e.target.value})}
            />
            <textarea
              className="bg-gray-800 border border-gray-700 text-gray-200 rounded px-3 py-2 w-full font-mono text-xs"
              rows={7} value={form.rules}
              onChange={(e) => setForm({...form, rules: e.target.value})}
            />
            <button className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded transition" onClick={create}>Create</button>
          </div>
        </section>
        <div className="space-y-3">
          {experiments.map((exp) => (
            <div key={exp.id} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
              <div className="flex justify-between items-start">
                <div>
                  <div className="font-medium text-gray-200">{exp.name}</div>
                  <div className="text-xs text-gray-500 mt-0.5">{exp.type}</div>
                  <div className="text-sm text-gray-400 mt-1">{exp.hypothesis}</div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[exp.status] ?? "bg-gray-700 text-gray-500"}`}>{exp.status}</span>
                  <div className="flex gap-1">
                    {exp.status === "PLANNED" && <button className="bg-green-700 hover:bg-green-600 text-white px-3 py-1 rounded text-xs" onClick={() => act(exp.id, "start")}>Start</button>}
                    {exp.status === "RUNNING" && <>
                      <button className="bg-yellow-700 hover:bg-yellow-600 text-white px-3 py-1 rounded text-xs" onClick={() => act(exp.id, "tick")}>Tick</button>
                      <button className="bg-red-700 hover:bg-red-600 text-white px-3 py-1 rounded text-xs" onClick={() => act(exp.id, "stop")}>Stop</button>
                    </>}
                  </div>
                </div>
              </div>
            </div>
          ))}
          {experiments.length === 0 && <p className="text-gray-500 text-sm">No experiments yet.</p>}
        </div>
      </main>
    </div>
  )
}
