import { NextRequest, NextResponse } from "next/server"
import { requireProjectAccess } from "@/lib/rbac"
import prisma from "@/lib/prisma"
import { getMetaToken } from "@/lib/getMetaToken"
import { createCampaign } from "@/lib/metaAds"

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { projectId, name, objective, status, dailyBudgetCents, lifetimeBudgetCents } = body
  const access = await requireProjectAccess(projectId, "OPERATOR")
  if ("status" in access) return access
  const project = await prisma.project.findUnique({ where: { id: projectId } })
  if (!project?.metaAdAccountId) return NextResponse.json({ error: "No ad account linked" }, { status: 400 })
  const tokenResult = await getMetaToken()
  if ("status" in tokenResult) return tokenResult
  const meta = await createCampaign(tokenResult.token, project.metaAdAccountId, {
    name, objective, status: status ?? "PAUSED", dailyBudget: dailyBudgetCents, lifetimeBudget: lifetimeBudgetCents,
  }) as { id: string }
  const campaign = await prisma.adCampaign.create({
    data: { projectId, metaCampaignId: meta.id, name, objective, status: status ?? "PAUSED", dailyBudgetCents, lifetimeBudgetCents },
  })
  return NextResponse.json({ campaign })
}
