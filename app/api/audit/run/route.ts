import Anthropic from "@anthropic-ai/sdk"
import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { requireProjectAccess } from "@/lib/rbac"
import { getAiConfigForProject } from "@/lib/aiConfig"

interface MetaInsightRow {
  campaignId: string
  impressions: number
  clicks: number
  conversions: number
  spend: number
}

interface AuditRow {
  campaignId: string
  metaConversions: number
  backendConversions: number
  metaSpend: number
  discrepancyPct: number
}

function placeholderInsights(): MetaInsightRow[] {
  return [
    { campaignId: "cmp_spring_sale", impressions: 42000, clicks: 1900, conversions: 108, spend: 1324.18 },
    { campaignId: "cmp_retargeting", impressions: 25500, clicks: 1240, conversions: 76, spend: 842.51 },
    { campaignId: "cmp_brand", impressions: 31000, clicks: 980, conversions: 41, spend: 557.22 },
  ]
}

async function fetchMetaInsightsFromApi(req: NextRequest, projectId: string): Promise<{ rows: MetaInsightRow[]; placeholder: boolean; warning?: string }> {
  try {
    const today = new Date()
    const since = new Date(today)
    since.setDate(today.getDate() - 30)

    const res = await fetch(new URL("/api/meta/insights", req.url), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        cookie: req.headers.get("cookie") ?? "",
      },
      body: JSON.stringify({
        projectId,
        level: "campaign",
        entityId: "me",
        since: since.toISOString().slice(0, 10),
        until: today.toISOString().slice(0, 10),
      }),
      cache: "no-store",
    })

    if (!res.ok) {
      return {
        rows: placeholderInsights(),
        placeholder: true,
        warning: `Meta API unavailable (${res.status}). Using placeholder insight data.`,
      }
    }

    const campaigns = await prisma.adCampaign.findMany({
      where: { projectId },
      select: { metaCampaignId: true },
      take: 50,
    })

    if (campaigns.length === 0) {
      return {
        rows: placeholderInsights(),
        placeholder: true,
        warning: "No synced campaigns found. Using placeholder insight data.",
      }
    }

    const insightRows = await prisma.insightDaily.findMany({
      where: {
        projectId,
        level: "campaign",
        entityId: { in: campaigns.map((c) => c.metaCampaignId) },
      },
    })

    if (insightRows.length === 0) {
      return {
        rows: placeholderInsights(),
        placeholder: true,
        warning: "Meta insights returned no rows. Using placeholder insight data.",
      }
    }

    const byCampaign = new Map<string, MetaInsightRow>()
    for (const row of insightRows) {
      const metrics = row.metrics_json as Record<string, unknown>
      const campaignId = row.entityId
      const current = byCampaign.get(campaignId) ?? {
        campaignId,
        impressions: 0,
        clicks: 0,
        conversions: 0,
        spend: 0,
      }
      current.impressions += Number(metrics.impressions ?? 0)
      current.clicks += Number(metrics.clicks ?? 0)
      current.conversions += Number(metrics.conversions ?? 0)
      current.spend += Number(metrics.spend ?? 0)
      byCampaign.set(campaignId, current)
    }

    return { rows: Array.from(byCampaign.values()), placeholder: false }
  } catch (error) {
    return {
      rows: placeholderInsights(),
      placeholder: true,
      warning: `Meta sync failed (${error instanceof Error ? error.message : "unknown error"}). Using placeholder insight data.`,
    }
  }
}

function buildSummaryPrompt(rows: AuditRow[], placeholderWarning?: string): string {
  return [
    "You are a paid media analyst.",
    "Explain discrepancies between Meta-reported conversions and backend conversions in plain language.",
    "Keep it concise (max 180 words), include likely causes and one action list.",
    placeholderWarning ? `Important context: ${placeholderWarning}` : "",
    "Data:",
    ...rows.map(
      (row) =>
        `- ${row.campaignId}: Meta conv=${row.metaConversions}, Backend conv=${row.backendConversions}, Gap=${row.discrepancyPct.toFixed(1)}%, Spend=$${row.metaSpend.toFixed(2)}`
    ),
  ]
    .filter(Boolean)
    .join("\n")
}

export async function GET(req: NextRequest) {
  const projectId = req.nextUrl.searchParams.get("projectId")
  if (!projectId) {
    return NextResponse.json({ error: "projectId is required" }, { status: 400 })
  }

  const access = await requireProjectAccess(projectId)
  if ("status" in access) return access

  const backendRows = await prisma.backendConversion.findMany({ where: { projectId } })
  const backendByCampaign = backendRows.reduce((acc, row) => {
    acc.set(row.campaignId, (acc.get(row.campaignId) ?? 0) + row.conversions)
    return acc
  }, new Map<string, number>())

  const meta = await fetchMetaInsightsFromApi(req, projectId)
  const reportRows: AuditRow[] = meta.rows.map((metaRow) => {
    const backendConversions = backendByCampaign.get(metaRow.campaignId) ?? 0
    const diff = metaRow.conversions - backendConversions
    const denominator = Math.max(backendConversions, 1)
    const discrepancyPct = (diff / denominator) * 100

    return {
      campaignId: metaRow.campaignId,
      metaConversions: metaRow.conversions,
      backendConversions,
      metaSpend: metaRow.spend,
      discrepancyPct,
    }
  })

  const aiConfig = await getAiConfigForProject(projectId)
  let aiSummary = "AI summary unavailable: no BYOK AI configuration found for this project."

  if (aiConfig) {
    try {
      const anthropic = new Anthropic({ apiKey: aiConfig.apiKey })
      const completion = await anthropic.messages.create({
        model: aiConfig.model,
        max_tokens: 300,
        temperature: 0.2,
        messages: [{ role: "user", content: buildSummaryPrompt(reportRows, meta.warning) }],
      })
      aiSummary = completion.content
        .map((block) => (block.type === "text" ? block.text : ""))
        .join("\n")
        .trim()
    } catch (error) {
      aiSummary = `AI summary failed: ${error instanceof Error ? error.message : "unknown error"}`
    }
  }

  const report = JSON.parse(
    JSON.stringify({
      generatedAt: new Date().toISOString(),
      metaDataSource: meta.placeholder ? "placeholder" : "meta",
      warning: meta.warning ?? null,
      campaigns: reportRows,
    })
  )

  await prisma.auditReport.create({
    data: {
      projectId,
      reportJson: report,
      aiSummary,
    },
  })

  return NextResponse.json({ report, aiSummary })
}
