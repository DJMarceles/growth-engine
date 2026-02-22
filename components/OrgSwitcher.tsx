"use client"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"

interface Org { id: string; name: string; type: string }

export function useActiveOrg() {
  const [activeOrgId, setActiveOrgIdState] = useState<string | null>(null)
  useEffect(() => { setActiveOrgIdState(localStorage.getItem("activeOrgId")) }, [])
  const setActiveOrg = (id: string) => { localStorage.setItem("activeOrgId", id); setActiveOrgIdState(id) }
  return { activeOrgId, setActiveOrg }
}

export default function OrgSwitcher() {
  const [orgs, setOrgs] = useState<Org[]>([])
  const { activeOrgId, setActiveOrg } = useActiveOrg()
  const router = useRouter()
  useEffect(() => { fetch("/api/orgs/list").then((r) => r.json()).then((d) => setOrgs(d.orgs ?? [])) }, [])
  const handleSwitch = async (orgId: string) => {
    await fetch(`/api/orgs/${orgId}/switch`, { method: "POST" })
    setActiveOrg(orgId); router.refresh()
  }
  return (
    <select className="border rounded px-2 py-1 text-sm" value={activeOrgId ?? ""} onChange={(e) => handleSwitch(e.target.value)}>
      <option value="" disabled>Select org</option>
      {orgs.map((o) => <option key={o.id} value={o.id}>{o.name} ({o.type})</option>)}
    </select>
  )
}
