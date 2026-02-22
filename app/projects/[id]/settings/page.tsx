"use client"
import { useEffect, useState } from "react"
import { ProjectNav } from "@/components/ProjectNav"

interface AdAccount {
  id: string
  name: string
  currency: string
}

interface Project {
  id: string
  name: string
  metaAdAccountId: string | null
}

export default function ProjectSettingsPage({ params }: { params: { id: string } }) {
  const [project, setProject] = useState<Project | null>(null)
  const [adAccounts, setAdAccounts] = useState<AdAccount[]>([])
  const [selected, setSelected] = useState("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [metaError, setMetaError] = useState(false)

  useEffect(() => {
    Promise.all([
      fetch(`/api/projects/list`).then(r => r.json()),
      fetch(`/api/meta/ad-accounts`).then(r => r.json()),
    ]).then(([projectsData, metaData]) => {
      const p = projectsData.projects?.find((p: Project) => p.id === params.id)
      if (p) {
        setProject(p)
        setSelected(p.metaAdAccountId ?? "")
      }
      if (metaData.accounts) {
        setAdAccounts(metaData.accounts)
      } else {
        setMetaError(true)
      }
      setLoading(false)
    })
  }, [params.id])

  async function save() {
    if (!selected) return
    setSaving(true)
    const account = adAccounts.find(a => a.id === selected)
    await fetch("/api/projects/link-ad-account", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        projectId: params.id,
        adAccountId: selected,
        adAccountName: account?.name ?? selected,
      }),
    })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <ProjectNav projectId={params.id} />

      <main className="max-w-4xl mx-auto px-6 py-10">
        <h1 className="text-2xl font-bold mb-1">Project Settings</h1>
        <p className="text-gray-400 text-sm mb-8">Connect a Meta Ad Account to pull live campaign data.</p>

        {loading ? (
          <div className="animate-pulse bg-gray-900 rounded-xl h-32" />
        ) : (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-400 mb-4">Meta Ad Account</h2>

            {metaError ? (
              <div className="bg-yellow-900/30 border border-yellow-700 rounded-lg p-4 mb-4">
                <p className="text-yellow-400 text-sm">Meta not connected.</p>
                <Link href="/auth/signin" className="text-yellow-300 text-sm underline mt-1 inline-block">Connect Meta →</Link>
              </div>
            ) : adAccounts.length === 0 ? (
              <p className="text-gray-500 text-sm">No ad accounts found on your Meta account.</p>
            ) : (
              <div className="space-y-4">
                {project?.metaAdAccountId && (
                  <div className="text-sm text-green-400 bg-green-900/20 border border-green-800 rounded-lg px-4 py-2">
                    Currently linked: <span className="font-mono">{project.metaAdAccountId}</span>
                  </div>
                )}
                <div>
                  <label className="block text-xs text-gray-400 mb-2 uppercase tracking-wide">Select Ad Account</label>
                  <select
                    value={selected}
                    onChange={e => setSelected(e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">-- choose --</option>
                    {adAccounts.map(a => (
                      <option key={a.id} value={a.id}>{a.name} ({a.id}) · {a.currency}</option>
                    ))}
                  </select>
                </div>
                <button
                  onClick={save}
                  disabled={!selected || saving}
                  className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium px-5 py-2 rounded-lg transition"
                >
                  {saving ? "Saving..." : saved ? "Saved ✓" : "Save"}
                </button>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
