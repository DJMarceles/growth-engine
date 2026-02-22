"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"

export default function NewProjectPage() {
  const [name, setName] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const create = async () => {
    const orgId = localStorage.getItem("activeOrgId")
    if (!orgId) { setError("No active org. Go to /orgs first."); return }
    if (!name.trim()) { setError("Name is required."); return }
    setLoading(true)
    const res = await fetch("/api/projects/create", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, orgId }),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error ?? "Failed"); setLoading(false); return }
    router.push(`/projects/${data.project.id}/dashboard`)
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="bg-white border rounded-xl p-8 w-full max-w-md">
        <h1 className="text-xl font-bold mb-6">New project</h1>
        <input className="border rounded-lg px-3 py-2 w-full mb-4" placeholder="Project name"
          value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && create()} autoFocus />
        {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
        <button onClick={create} disabled={loading} className="w-full bg-blue-600 text-white py-2 rounded-lg disabled:opacity-50">
          {loading ? "Creating..." : "Create project"}
        </button>
      </div>
    </div>
  )
}
