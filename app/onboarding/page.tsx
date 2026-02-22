"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { signIn, useSession } from "next-auth/react"

interface WizardState {
  agencyOrgId?: string; agencyOrgName?: string
  clientOrgId?: string; clientOrgName?: string
  adAccountId?: string; adAccountName?: string
}

const STEPS = ["Your agency", "Client", "Meta account", "Project"]

function StepBar({ current }: { current: number }) {
  return (
    <div className="flex items-center gap-0 mb-10">
      {STEPS.map((label, i) => {
        const done = i < current; const active = i === current
        return (
          <div key={i} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${done || active ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-400"}`}>
                {done ? "✓" : i + 1}
              </div>
              <span className={`text-xs mt-1 whitespace-nowrap ${active ? "text-blue-600 font-medium" : "text-gray-400"}`}>{label}</span>
            </div>
            {i < STEPS.length - 1 && <div className={`flex-1 h-px mx-2 mb-4 ${done ? "bg-blue-600" : "bg-gray-200"}`} />}
          </div>
        )
      })}
    </div>
  )
}

function Shell({ children, step }: { children: React.ReactNode; step: number }) {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl border shadow-sm w-full max-w-lg p-8">
        <div className="mb-2 text-blue-600 font-semibold text-sm tracking-wide">Setup wizard</div>
        <StepBar current={step} />
        {children}
      </div>
    </div>
  )
}

export default function OnboardingPage() {
  const [step, setStep] = useState(0)
  const [state, setState] = useState<WizardState>({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [name, setName] = useState("")
  const [adAccounts, setAdAccounts] = useState<{id:string;name:string;currency:string}[]>([])
  const [selectedAd, setSelectedAd] = useState("")
  const [metaConnected, setMetaConnected] = useState(false)
  const { data: session } = useSession()
  const router = useRouter()

  const next = (data: Partial<WizardState>) => { setState((p) => ({...p, ...data})); setStep((s) => s + 1); setName(""); setError(null) }

  const step1 = async () => {
    if (!name.trim()) { setError("Required"); return }
    setLoading(true); setError(null)
    const res = await fetch("/api/orgs/create", { method: "POST", headers: {"Content-Type":"application/json"}, body: JSON.stringify({name, type: "AGENCY"}) })
    const data = await res.json()
    if (!res.ok) { setError(data.error); setLoading(false); return }
    localStorage.setItem("activeOrgId", data.org.id)
    setLoading(false); next({ agencyOrgId: data.org.id, agencyOrgName: name })
  }

  const step2 = async () => {
    if (!name.trim()) { setError("Required"); return }
    setLoading(true); setError(null)
    const res = await fetch("/api/orgs/create", { method: "POST", headers: {"Content-Type":"application/json"}, body: JSON.stringify({name, type: "CLIENT", parentOrgId: state.agencyOrgId}) })
    const data = await res.json()
    if (!res.ok) { setError(data.error); setLoading(false); return }
    setLoading(false); next({ clientOrgId: data.org.id, clientOrgName: name })
  }

  const loadAdAccounts = async () => {
    setLoading(true); setError(null)
    const res = await fetch("/api/meta/ad-accounts")
    const data = await res.json()
    if (!data.accounts?.length) { setError("No ad accounts found or Meta not connected."); setLoading(false); return }
    setAdAccounts(data.accounts); setMetaConnected(true); setLoading(false)
  }

  const step3 = () => {
    if (!selectedAd) { setError("Select an ad account"); return }
    const acc = adAccounts.find((a) => a.id === selectedAd)
    next({ adAccountId: selectedAd, adAccountName: acc?.name })
  }

  const step4 = async () => {
    if (!name.trim()) { setError("Required"); return }
    setLoading(true); setError(null)
    const res = await fetch("/api/projects/create", { method: "POST", headers: {"Content-Type":"application/json"}, body: JSON.stringify({name, orgId: state.clientOrgId}) })
    const data = await res.json()
    if (!res.ok) { setError(data.error); setLoading(false); return }
    await fetch("/api/projects/link-ad-account", { method: "POST", headers: {"Content-Type":"application/json"}, body: JSON.stringify({projectId: data.project.id, adAccountId: state.adAccountId, adAccountName: state.adAccountName}) })
    router.push(`/projects/${data.project.id}/dashboard`)
  }

  const Btn = ({ onClick, label }: {onClick: () => void; label: string}) => (
    <button onClick={onClick} disabled={loading} className="w-full bg-blue-600 text-white py-2.5 rounded-lg font-medium text-sm hover:bg-blue-700 disabled:opacity-40 transition">
      {loading ? "Please wait..." : label}
    </button>
  )
  const Back = () => <button onClick={() => { setStep(s => s-1); setError(null) }} className="text-sm text-gray-400 hover:text-gray-600 mt-3 w-full text-center">← Back</button>
  const Err = () => error ? <p className="text-red-500 text-sm mb-4">{error}</p> : null

  return (
    <Shell step={step}>
      {step === 0 && <>
        <h2 className="text-xl font-bold mb-1">Your agency</h2>
        <p className="text-gray-500 text-sm mb-6">The top-level account your team works from.</p>
        <input autoFocus className="w-full border rounded-lg px-3 py-2 text-sm mb-4" placeholder="e.g. Kollie Agency" value={name} onChange={(e) => setName(e.target.value)} />
        <Err /><Btn onClick={step1} label="Continue →" />
      </>}
      {step === 1 && <>
        <h2 className="text-xl font-bold mb-1">Add your first client</h2>
        <p className="text-gray-500 text-sm mb-6">Under <strong>{state.agencyOrgName}</strong>.</p>
        <input autoFocus className="w-full border rounded-lg px-3 py-2 text-sm mb-4" placeholder="e.g. Acme B.V." value={name} onChange={(e) => setName(e.target.value)} />
        <Err /><Btn onClick={step2} label="Continue →" /><Back />
      </>}
      {step === 2 && <>
        <h2 className="text-xl font-bold mb-1">Select ad account</h2>
        {!session ? (
          <><p className="text-gray-500 text-sm mb-6">Sign in with Facebook first.</p><Btn onClick={() => signIn("facebook")} label="Connect with Facebook →" /></>
        ) : !metaConnected ? (
          <><p className="text-gray-500 text-sm mb-6">Connected as <strong>{session.user?.email}</strong></p><Err /><Btn onClick={loadAdAccounts} label="Load ad accounts →" /></>
        ) : (
          <>
            <select className="w-full border rounded-lg px-3 py-2 text-sm mb-4" value={selectedAd} onChange={(e) => setSelectedAd(e.target.value)}>
              <option value="">Select...</option>
              {adAccounts.map((a) => <option key={a.id} value={a.id}>{a.name} ({a.currency})</option>)}
            </select>
            <Err /><Btn onClick={step3} label="Continue →" />
          </>
        )}
        <Back />
      </>}
      {step === 3 && <>
        <h2 className="text-xl font-bold mb-1">Create first project</h2>
        <p className="text-gray-500 text-sm mb-6">For <strong>{state.clientOrgName}</strong> using <strong>{state.adAccountName}</strong>.</p>
        <input autoFocus className="w-full border rounded-lg px-3 py-2 text-sm mb-4" placeholder="e.g. Acme — Q1 Growth" value={name} onChange={(e) => setName(e.target.value)} />
        <Err /><Btn onClick={step4} label="Launch dashboard →" /><Back />
      </>}
    </Shell>
  )
}
