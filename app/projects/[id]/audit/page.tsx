"use client"

import { FormEvent, useMemo, useState } from "react"
import { ProjectNav } from "@/components/ProjectNav"

interface CampaignAuditRow {
  campaignId: string
  metaConversions: number
  backendConversions: number
  discrepancyPct: number
  metaSpend: number
}

interface AuditReportResponse {
  report: {
    generatedAt: string
    warning?: string
    campaigns: CampaignAuditRow[]
  }
  aiSummary: string
}

export default function AuditPage({ params }: { params: { id: string } }) {
  const projectId = params.id
  const [jsonInput, setJsonInput] = useState('[]')
  const [audit, setAudit] = useState<AuditReportResponse | null>(null)
  const [importing, setImporting] = useState(false)
  const [running, setRunning] = useState(false)
  const [loadingReports, setLoadingReports] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const hasRows = useMemo(() => (audit?.report.campaigns?.length ?? 0) > 0, [audit])

  const importConversions = async (e: FormEvent) => {
    e.preventDefault()
    setImporting(true)
    setMessage(null)
    try {
      const parsed = JSON.parse(jsonInput)
      const res = await fetch(`/api/audit/import-conversions?projectId=${projectId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed),
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error ?? "Import failed")
      }
      setMessage(`Imported ${data.inserted} conversion rows.`)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Invalid JSON payload")
    } finally {
      setImporting(false)
    }
  }

  const runAudit = async () => {
    setRunning(true)
    setMessage(null)
    try {
      const res = await fetch(`/api/audit/run?projectId=${projectId}`)
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error ?? "Audit run failed")
      }
      setAudit(data)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to run audit")
    } finally {
      setRunning(false)
    }
  }

  const loadLatestReport = async () => {
    setLoadingReports(true)
    try {
      const res = await fetch(`/api/audit/reports?projectId=${projectId}`)
      const data = await res.json()
      if (res.ok && Array.isArray(data.reports) && data.reports.length > 0) {
        const latest = data.reports[0]
        setAudit({ report: latest.reportJson, aiSummary: latest.aiSummary })
      }
    } finally {
      setLoadingReports(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <ProjectNav projectId={projectId} />
      <main className="max-w-6xl mx-auto px-6 py-8 space-y-8">
        <h1 className="text-2xl font-bold">Performance Auditor</h1>

        <section className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h2 className="font-semibold mb-3">Import backend conversions (JSON)</h2>
          <form onSubmit={importConversions} className="space-y-3">
            <textarea
              className="w-full h-48 bg-gray-950 border border-gray-800 rounded-lg p-3 font-mono text-sm"
              value={jsonInput}
              onChange={(e) => setJsonInput(e.target.value)}
            />
            <button
              type="submit"
              disabled={importing}
              className="px-4 py-2 rounded-lg bg-indigo-500 hover:bg-indigo-400 disabled:opacity-60"
            >
              {importing ? "Importing..." : "Submit conversions"}
            </button>
          </form>
        </section>

        <section className="bg-gray-900 border border-gray-800 rounded-xl p-5 flex items-center gap-3">
          <button
            onClick={runAudit}
            disabled={running}
            className="px-4 py-2 rounded-lg bg-indigo-500 hover:bg-indigo-400 disabled:opacity-60"
          >
            {running ? "Running audit..." : "Run Audit"}
          </button>
          <button
            onClick={loadLatestReport}
            disabled={loadingReports}
            className="px-4 py-2 rounded-lg border border-gray-700 hover:bg-gray-800 disabled:opacity-60"
          >
            {loadingReports ? "Loading..." : "Load latest report"}
          </button>
          {message && <p className="text-sm text-gray-400">{message}</p>}
        </section>

        <section className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h2 className="font-semibold mb-3">Latest audit report</h2>
          {audit?.report.warning && (
            <p className="mb-3 text-sm text-amber-300">{audit.report.warning}</p>
          )}
          {hasRows ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-400 border-b border-gray-800">
                    <th className="py-2">Campaign</th>
                    <th className="py-2">Meta conversions</th>
                    <th className="py-2">Backend conversions</th>
                    <th className="py-2">Gap %</th>
                    <th className="py-2">Spend</th>
                  </tr>
                </thead>
                <tbody>
                  {audit?.report.campaigns.map((row) => (
                    <tr key={row.campaignId} className="border-b border-gray-800 last:border-none">
                      <td className="py-2">{row.campaignId}</td>
                      <td className="py-2">{row.metaConversions}</td>
                      <td className="py-2">{row.backendConversions}</td>
                      <td className="py-2">{row.discrepancyPct.toFixed(1)}%</td>
                      <td className="py-2">${row.metaSpend.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-gray-500">No report loaded yet.</p>
          )}

          {audit?.aiSummary && (
            <div className="mt-5 border-t border-gray-800 pt-4">
              <h3 className="font-medium mb-2">AI Summary</h3>
              <p className="text-sm text-gray-300 whitespace-pre-wrap">{audit.aiSummary}</p>
            </div>
          )}
        </section>
      </main>
    </div>
  )
}
