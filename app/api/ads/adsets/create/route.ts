import { NextRequest, NextResponse } from "next/server"
import { requireProjectAccess } from "@/lib/rbac"
import prisma from "@/lib/prisma"
import { getMetaToken } from "@/lib/getMetaToken"
import { createAdSet } from "@/lib/metaAds"

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { projectId, campaignId, name, targeting, optimizationGoal, billingEvent, bidStrategy, budgetCents, startTime, endTime, status } = body
  const access = await requireProjectAccess(projectId, "OPERATOR")
  if ("status" in access) return access
  const project = await prisma.project.findUnique({ where: { id: projectId } })
  if (!project?.metaAdAccountId) return NextResponse.json({ error: "No ad account" }, { status: 400 })
  const campaign = await prisma.adCampaign.findUnique({ where: { id: campaignId } })
  if (!campaign) return NextResponse.json({ error: "Campaign not found" }, { status: 404 })
  const tokenResult = await getMetaToken()
  if ("status" in tokenResult) return tokenResult
  const meta = await createAdSet(tokenResult.token, project.metaAdAccountId, {
    name, campaignId: campaign.metaCampaignId, targeting, optimizationGoal,
    billingEvent, bidStrategy, budgetCents, startTime, endTime, status: status ?? "PAUSED",
  }) as { id: string }
  const adSet = await prisma.adSet.create({
    data: { projectId, campaignId, metaAdSetId: meta.id, name, targeting_json: targeting,
      optimizationGoal, billingEvent, bidStrategy, budgetCents,
      startTime: new Date(startTime), endTime: endTime ? new Date(endTime) : null, status: status ?? "PAUSED" },
  })
  return NextResponse.json({ adSet })
}
