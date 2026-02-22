import Anthropic from "@anthropic-ai/sdk"
import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { requireProjectAccess } from "@/lib/rbac"

const FALLBACK_MODEL = "claude-3-5-sonnet-latest"

interface GeneratePageInput {
  projectId: string
  productName: string
  tagline: string
  keyBenefit1: string
  keyBenefit2: string
  keyBenefit3: string
  ctaText: string
  primaryColor: string
  logoUrl: string
}

function hasText(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0
}

function stripMarkdownFence(value: string): string {
  return value
    .replace(/^```html\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/, "")
    .trim()
}

function buildPrompt(input: GeneratePageInput) {
  return `
Generate a complete single-file HTML landing page.

Requirements:
- Return ONLY valid HTML. No markdown, no backticks, no explanations.
- Include Tailwind CSS via CDN script tag: <script src="https://cdn.tailwindcss.com"></script>
- Mobile responsive layout.
- Use the provided copy exactly as core content.
- Use the provided primary color prominently for buttons, highlights, and accents.
- Include a hero section with the provided logo URL, product name, tagline, and CTA.
- Include a section that presents the three key benefits clearly.
- Add a simple footer.

Inputs:
- Product name: ${input.productName}
- Tagline: ${input.tagline}
- Key benefit 1: ${input.keyBenefit1}
- Key benefit 2: ${input.keyBenefit2}
- Key benefit 3: ${input.keyBenefit3}
- CTA text: ${input.ctaText}
- Primary color (hex): ${input.primaryColor}
- Logo URL: ${input.logoUrl}
`.trim()
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 })
  }

  const input: GeneratePageInput = {
    projectId: String((body as Record<string, unknown>).projectId ?? ""),
    productName: String((body as Record<string, unknown>).productName ?? ""),
    tagline: String((body as Record<string, unknown>).tagline ?? ""),
    keyBenefit1: String((body as Record<string, unknown>).keyBenefit1 ?? ""),
    keyBenefit2: String((body as Record<string, unknown>).keyBenefit2 ?? ""),
    keyBenefit3: String((body as Record<string, unknown>).keyBenefit3 ?? ""),
    ctaText: String((body as Record<string, unknown>).ctaText ?? ""),
    primaryColor: String((body as Record<string, unknown>).primaryColor ?? ""),
    logoUrl: String((body as Record<string, unknown>).logoUrl ?? ""),
  }

  const missing = Object.entries(input)
    .filter(([_, value]) => !hasText(value))
    .map(([key]) => key)
  if (missing.length > 0) {
    return NextResponse.json({ error: `Missing required fields: ${missing.join(", ")}` }, { status: 400 })
  }

  if (!/^#(?:[0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(input.primaryColor)) {
    return NextResponse.json({ error: "primaryColor must be a valid hex color." }, { status: 400 })
  }

  try {
    const parsedUrl = new URL(input.logoUrl)
    if (!["http:", "https:"].includes(parsedUrl.protocol)) {
      throw new Error("Invalid logo URL protocol")
    }
  } catch {
    return NextResponse.json({ error: "logoUrl must be a valid http/https URL." }, { status: 400 })
  }

  const access = await requireProjectAccess(input.projectId, "OPERATOR")
  if ("status" in access) return access

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY is not configured." }, { status: 500 })
  }

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  const model = process.env.ANTHROPIC_MODEL ?? FALLBACK_MODEL

  try {
    const response = await anthropic.messages.create({
      model,
      max_tokens: 4096,
      temperature: 0.3,
      messages: [{ role: "user", content: buildPrompt(input) }],
    })

    const rawHtml = response.content
      .map((block) => {
        if (block.type === "text") return block.text
        return ""
      })
      .join("\n")
      .trim()

    const html = stripMarkdownFence(rawHtml)
    if (!html.toLowerCase().includes("<html")) {
      return NextResponse.json({ error: "Model did not return valid HTML." }, { status: 502 })
    }

    const landingPage = await prisma.landingPage.create({
      data: {
        projectId: input.projectId,
        html,
      },
    })

    return NextResponse.json({ landingPage })
  } catch (error) {
    console.error("Landing page generation failed:", error)
    return NextResponse.json({ error: "Failed to generate landing page." }, { status: 500 })
  }
}
