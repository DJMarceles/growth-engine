"use client"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"

interface Org { id: string; name: string; type: string; role: string }

export default function OrgsPage() {
  const [orgs, setOrgs] = useState<Org[]>([])
  const [name, setName] = useState("")
  const [type, setType] = useState("CLIENT")
  const router = useRouter()

  const load = () => fetch("/api/orgs/list").then((r) => r.json()).then((d) => setOrgs(d.orgs ?? []))
  useEffect(() => { load() }, [])

  const create = async () => {
    await fetch("/api/orgs/create", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, type }),
    })
    setName("")
    load()
  }

  const switchOrg = async (id: string) => {
    await fetch(`/api/orgs/${id}/switch`, { method: "POST" })
    localStorage.setItem("activeOrgId", id)
    router.push("/projects")
  }

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Organizations</h1>
      <div className="mb-8 flex gap-2">
        <input className="border rounded px-3 py-2 flex-1" placeholder="Org name" value={name} onChange={(e) => setName(e.target.value)} />
        <select className="border rounded px-3 py-2" value={type} onChange={(e) => setType(e.target.value)}>
          <option value="CLIENT">Client</option>
          <option value="AGENCY">Agency</option>
        </select>
        <button className="bg-blue-600 text-white px-4 py-2 rounded" onClick={create}>Create</button>
      </div>
      <div className="space-y-3">
        {orgs.map((org) => (
          <div key={org.id} className="border rounded p-4 flex justify-between items-center">
            <div>
              <div className="font-medium">{org.name}</div>
              <div className="text-sm text-gray-500">{org.type} · {org.role}</div>
            </div>
            <button className="bg-gray-100 px-3 py-1 rounded text-sm" onClick={() => switchOrg(org.id)}>Switch</button>
          </div>
        ))}
      </div>
    </div>
  )
}
