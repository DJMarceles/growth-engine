"use client"
import Link from "next/link"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import OrgSwitcher from "@/components/OrgSwitcher"

interface Org {
  id: string
  name: string
  type: string
  role: string
}

export default function OrgsPage() {
  const [orgs, setOrgs] = useState<Org[]>([])
  const [name, setName] = useState("")
  const [type, setType] = useState("CLIENT")
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [switchingOrgId, setSwitchingOrgId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch("/api/orgs/list")
      const data = await response.json()
      setOrgs(data.orgs ?? [])
    } catch {
      setError("Unable to load organizations. Please refresh.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const create = async () => {
    if (!name.trim()) return
    setCreating(true)
    setError(null)
    try {
      await fetch("/api/orgs/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), type }),
      })
      setName("")
      await load()
    } catch {
      setError("Unable to create organization.")
    } finally {
      setCreating(false)
    }
  }

  const switchOrg = async (id: string) => {
    setSwitchingOrgId(id)
    setError(null)
    try {
      await fetch(`/api/orgs/${id}/switch`, { method: "POST" })
      localStorage.setItem("activeOrgId", id)
      router.push("/projects")
    } catch {
      setError("Unable to switch organization.")
      setSwitchingOrgId(null)
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <header className="sticky top-0 z-30 border-b border-gray-800 bg-gray-950/95 backdrop-blur">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-3 px-6 py-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-6">
            <Link href="/dashboard" className="text-base font-semibold tracking-tight text-white">
              Growth Engine
            </Link>
            <nav className="flex items-center gap-2 text-sm text-gray-400">
              <Link href="/orgs" className="rounded-md bg-gray-800 px-3 py-1.5 text-white">
                Organizations
              </Link>
              <Link href="/projects" className="rounded-md px-3 py-1.5 transition hover:bg-gray-800 hover:text-white">
                Projects
              </Link>
              <Link href="/dashboard" className="rounded-md px-3 py-1.5 transition hover:bg-gray-800 hover:text-white">
                Dashboard
              </Link>
            </nav>
          </div>

          <div className="[&_select]:rounded-md [&_select]:border [&_select]:border-gray-700 [&_select]:bg-gray-900 [&_select]:px-3 [&_select]:py-2 [&_select]:text-sm [&_select]:text-gray-200 [&_select]:outline-none [&_select]:transition [&_select]:focus:border-indigo-500 [&_select]:focus:ring-1 [&_select]:focus:ring-indigo-500/40">
            <OrgSwitcher />
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl px-6 py-10">
        <section className="mb-8">
          <h1 className="text-3xl font-bold text-white md:text-4xl">Organizations</h1>
          <p className="mt-2 text-sm text-gray-400">
            Create and manage organizations, then switch context for project operations.
          </p>
        </section>

        {error && (
          <div className="mb-6 rounded-xl border border-rose-500/40 bg-rose-500/10 p-4 text-sm text-rose-300">
            {error}
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-5">
          <section className="rounded-xl border border-gray-800 bg-gray-900 p-6 lg:col-span-2">
            <h2 className="text-lg font-semibold text-white">Create Organization</h2>
            <p className="mt-1 text-sm text-gray-400">Set up a new workspace for client or agency operations.</p>

            <div className="mt-5 space-y-4">
              <div>
                <label htmlFor="org-name" className="mb-2 block text-xs font-semibold uppercase tracking-wide text-gray-400">
                  Organization name
                </label>
                <input
                  id="org-name"
                  className="w-full rounded-lg border border-gray-700 bg-gray-950 px-3 py-2 text-sm text-gray-100 outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/40"
                  placeholder="Acme Growth"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  onKeyDown={(event) => event.key === "Enter" && create()}
                />
              </div>

              <div>
                <label htmlFor="org-type" className="mb-2 block text-xs font-semibold uppercase tracking-wide text-gray-400">
                  Organization type
                </label>
                <select
                  id="org-type"
                  className="w-full rounded-lg border border-gray-700 bg-gray-950 px-3 py-2 text-sm text-gray-100 outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/40"
                  value={type}
                  onChange={(event) => setType(event.target.value)}
                >
                  <option value="CLIENT">Client</option>
                  <option value="AGENCY">Agency</option>
                </select>
              </div>

              <button
                className="w-full rounded-lg bg-indigo-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-50"
                onClick={create}
                disabled={creating || !name.trim()}
              >
                {creating ? "Creating..." : "Create Organization"}
              </button>
            </div>
          </section>

          <section className="rounded-xl border border-gray-800 bg-gray-900 p-6 lg:col-span-3">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">Your Organizations</h2>
              <span className="rounded-full border border-gray-700 bg-gray-950 px-2.5 py-1 text-xs font-semibold text-gray-300">
                {orgs.length} total
              </span>
            </div>

            {loading && (
              <div className="space-y-3 animate-pulse">
                {[1, 2, 3].map((item) => (
                  <div key={item} className="rounded-lg border border-gray-800 bg-gray-950 p-4">
                    <div className="h-5 w-48 rounded bg-gray-800" />
                    <div className="mt-3 h-4 w-32 rounded bg-gray-800" />
                  </div>
                ))}
              </div>
            )}

            {!loading && orgs.length === 0 && (
              <div className="rounded-lg border border-dashed border-gray-700 bg-gray-950 p-8 text-center">
                <p className="mb-4 text-sm text-gray-300">No organizations yet. Create your first organization to continue.</p>
                <button
                  className="rounded-md bg-indigo-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-400"
                  onClick={() => document.getElementById("org-name")?.focus()}
                >
                  Create First Organization
                </button>
              </div>
            )}

            {!loading && orgs.length > 0 && (
              <div className="space-y-3">
                {orgs.map((org) => (
                  <div
                    key={org.id}
                    className="flex flex-col gap-3 rounded-lg border border-gray-800 bg-gray-950 p-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <p className="text-base font-semibold text-white">{org.name}</p>
                      <p className="mt-1 text-xs text-gray-400">
                        {org.type} · {org.role}
                      </p>
                    </div>
                    <button
                      className="rounded-md border border-gray-700 bg-gray-900 px-3 py-2 text-sm font-medium text-gray-200 transition hover:border-indigo-400 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                      onClick={() => switchOrg(org.id)}
                      disabled={switchingOrgId === org.id}
                    >
                      {switchingOrgId === org.id ? "Switching..." : "Switch"}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  )
}
