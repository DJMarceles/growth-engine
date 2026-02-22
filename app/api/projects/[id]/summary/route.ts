import { NextRequest, NextResponse } from "next/server"
import { requireProjectAccess } from "@/lib/rbac"
import prisma from "@/lib/prisma"

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const access = await requireProjectAccess(params.id)
  if ("status" in access) return access
  const projectId = params.id
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const sevenDaysAgo = new Date(today)
  sevenDaysAgo.setDate(today.getDate() - 7)
  const [campaigns, experiments, recentDecisions, insightRows] = await Promise.all([
    prisma.adCampaign.findMany({ where: { projectId }, orderBy: { createdAt: "desc" }, take: 10 }),
    prisma.experiment.findMany({
      where: { projectId }, orderBy: { createdAt: "desc" }, take: 5,
      include: { runs: { orderBy: { createdAt: "desc" }, take: 1 } },
    }),
    prisma.decisionLog.findMany({ where: { projectId }, orderBy: { createdAt: "desc" }, take: 5 }),
    prisma.insightDaily.findMany({ where: { projectId, date: { gte: sevenDaysAgo } } }),
  ])
  const totals = insightRows.reduce(
    (acc, row) => {
      const m = row.metrics_json as Record<string, number>
      acc.spend += Number(m.spend ?? 0)
      acc.clicks += Number(m.clicks ?? 0)
      acc.impressions += Number(m.impressions ?? 0)
      acc.conversions += Number(m.conversions ?? 0)
      return acc
    },
    { spend: 0, clicks: 0, impressions: 0, conversions: 0 }
  )
  return NextResponse.json({
    totals: { ...totals, ctr: totals.impressions > 0 ? (totals.clicks / totals.impressions) * 100 : 0, cpc: totals.clicks > 0 ? totals.spend / totals.clicks : 0 },
    campaigns, experiments, recentDecisions,
    activeCampaigns: campaigns.filter((c) => c.status === "ACTIVE").length,
    runningExperiments: experiments.filter((e) => e.status === "RUNNING").length,
  })
}
