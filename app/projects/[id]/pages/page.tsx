"use client"
import { FormEvent, useState } from "react"
import { ProjectNav } from "@/components/ProjectNav"

interface LandingPageRecord {
  id: string
  projectId: string
  html: string
  createdAt: string
  deployedUrl: string | null
}

interface FormState {
  productName: string
  tagline: string
  keyBenefit1: string
  keyBenefit2: string
  keyBenefit3: string
  ctaText: string
  primaryColor: string
  logoUrl: string
}

const INITIAL_FORM: FormState = {
  productName: "",
  tagline: "",
  keyBenefit1: "",
  keyBenefit2: "",
  keyBenefit3: "",
  ctaText: "",
  primaryColor: "#2563eb",
  logoUrl: "",
}

export default function ProjectPagesPage({ params }: { params: { id: string } }) {
  const projectId = params.id
  const [form, setForm] = useState<FormState>(INITIAL_FORM)
  const [landingPage, setLandingPage] = useState<LandingPageRecord | null>(null)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState("")

  const generatePage = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setGenerating(true)
    setError("")

    try {
      const response = await fetch("/api/pages/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, ...form }),
      })

      const data = await response.json()
      if (!response.ok) {
        setError(data.error ?? `Request failed (${response.status})`)
        return
      }

      setLandingPage(data.landingPage ?? null)
    } catch {
      setError("Failed to generate page.")
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <ProjectNav projectId={projectId} />

      <main className="max-w-7xl mx-auto px-6 py-8 grid grid-cols-1 gap-6 xl:grid-cols-5">
        <section className="xl:col-span-2 bg-gray-900 border border-gray-800 rounded-xl p-6">
          <h1 className="text-2xl font-bold mb-1">Landing Page Generator</h1>
          <p className="text-sm text-gray-400 mb-6">Generate a one-page HTML landing page with Claude Sonnet.</p>

          <form className="space-y-4" onSubmit={generatePage}>
            <div>
              <label className="block text-xs uppercase tracking-wide text-gray-400 mb-1">Product Name</label>
              <input
                required
                className="w-full rounded-lg bg-gray-800 border border-gray-700 px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                value={form.productName}
                onChange={(event) => setForm({ ...form, productName: event.target.value })}
                placeholder="Acme Analytics"
              />
            </div>

            <div>
              <label className="block text-xs uppercase tracking-wide text-gray-400 mb-1">Tagline (One Sentence)</label>
              <textarea
                required
                rows={2}
                className="w-full rounded-lg bg-gray-800 border border-gray-700 px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                value={form.tagline}
                onChange={(event) => setForm({ ...form, tagline: event.target.value })}
                placeholder="Turn paid traffic into predictable revenue."
              />
            </div>

            <div>
              <label className="block text-xs uppercase tracking-wide text-gray-400 mb-1">Key Benefit 1</label>
              <input
                required
                className="w-full rounded-lg bg-gray-800 border border-gray-700 px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                value={form.keyBenefit1}
                onChange={(event) => setForm({ ...form, keyBenefit1: event.target.value })}
                placeholder="Real-time conversion insights"
              />
            </div>

            <div>
              <label className="block text-xs uppercase tracking-wide text-gray-400 mb-1">Key Benefit 2</label>
              <input
                required
                className="w-full rounded-lg bg-gray-800 border border-gray-700 px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                value={form.keyBenefit2}
                onChange={(event) => setForm({ ...form, keyBenefit2: event.target.value })}
                placeholder="Faster experiment cycles"
              />
            </div>

            <div>
              <label className="block text-xs uppercase tracking-wide text-gray-400 mb-1">Key Benefit 3</label>
              <input
                required
                className="w-full rounded-lg bg-gray-800 border border-gray-700 px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                value={form.keyBenefit3}
                onChange={(event) => setForm({ ...form, keyBenefit3: event.target.value })}
                placeholder="Built-in performance guardrails"
              />
            </div>

            <div>
              <label className="block text-xs uppercase tracking-wide text-gray-400 mb-1">CTA Text</label>
              <input
                required
                className="w-full rounded-lg bg-gray-800 border border-gray-700 px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                value={form.ctaText}
                onChange={(event) => setForm({ ...form, ctaText: event.target.value })}
                placeholder="Start Free Trial"
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs uppercase tracking-wide text-gray-400 mb-1">Primary Color (Hex)</label>
                <input
                  required
                  pattern="^#(?:[0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$"
                  className="w-full rounded-lg bg-gray-800 border border-gray-700 px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  value={form.primaryColor}
                  onChange={(event) => setForm({ ...form, primaryColor: event.target.value })}
                  placeholder="#2563eb"
                />
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wide text-gray-400 mb-1">Logo URL</label>
                <input
                  required
                  type="url"
                  className="w-full rounded-lg bg-gray-800 border border-gray-700 px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  value={form.logoUrl}
                  onChange={(event) => setForm({ ...form, logoUrl: event.target.value })}
                  placeholder="https://example.com/logo.png"
                />
              </div>
            </div>

            {error && <div className="rounded-lg border border-red-800 bg-red-950/40 px-3 py-2 text-sm text-red-400">{error}</div>}

            <button
              type="submit"
              disabled={generating}
              className="w-full rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-medium px-4 py-2 transition"
            >
              {generating ? "Generating..." : "Generate Landing Page"}
            </button>
          </form>
        </section>

        <section className="xl:col-span-3 bg-gray-900 border border-gray-800 rounded-xl p-4">
          <div className="mb-3">
            <h2 className="text-lg font-semibold">Preview</h2>
            {landingPage?.createdAt && (
              <p className="text-xs text-gray-500 mt-1">
                Last generated: {new Date(landingPage.createdAt).toLocaleString("en-US")}
              </p>
            )}
          </div>

          {landingPage?.html ? (
            <iframe
              title="Generated landing page preview"
              srcDoc={landingPage.html}
              className="w-full h-[760px] rounded-lg border border-gray-700 bg-white"
            />
          ) : (
            <div className="h-[760px] rounded-lg border border-dashed border-gray-700 bg-gray-950 flex items-center justify-center text-sm text-gray-500">
              Submit the form to generate a preview.
            </div>
          )}
        </section>
      </main>
    </div>
  )
}
