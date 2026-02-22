"use client"
import { useEffect, useState } from "react"
import Link from "next/link"

interface Project { id: string; name: string; metaAdAccountId: string | null }

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const orgId = localStorage.getItem("activeOrgId")
    if (!orgId) { setLoading(false); return }
    fetch(`/api/projects/list?orgId=${orgId}`)
      .then((r) => r.json())
      .then((d) => { setProjects(d.projects ?? []); setLoading(false) })
  }, [])

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Projects</h1>
          <Link href="/projects/new" className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm">New project</Link>
        </div>
        {loading && <p className="text-gray-400 text-sm">Loading...</p>}
        <div className="space-y-3">
          {projects.map((p) => (
            <Link key={p.id} href={`/projects/${p.id}/dashboard`}
              className="block bg-white border rounded-xl px-5 py-4 hover:border-blue-400 transition">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-gray-900">{p.name}</div>
                  <div className="text-xs text-gray-400 mt-0.5">{p.metaAdAccountId ? "Meta connected" : "Meta not connected"}</div>
                </div>
                <span className="text-gray-300 text-lg">→</span>
              </div>
            </Link>
          ))}
          {!loading && projects.length === 0 && (
            <div className="bg-white border border-dashed rounded-xl p-8 text-center">
              <p className="text-gray-400 mb-3">No projects yet.</p>
              <Link href="/projects/new" className="text-blue-600 text-sm hover:underline">Create your first project →</Link>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
