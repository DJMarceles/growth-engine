import { NextRequest, NextResponse } from "next/server"
import { requireProjectAccess } from "@/lib/rbac"
import prisma from "@/lib/prisma"
import { getMetaToken } from "@/lib/getMetaToken"
import { updateStatus } from "@/lib/metaAds"

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const campaign = await prisma.adCampaign.findUnique({ where: { id: params.id } })
  if (!campaign) return NextResponse.json({ error: "Not found" }, { status: 404 })
  const access = await requireProjectAccess(campaign.projectId, "OPERATOR")
  if ("status" in access) return access
  const tokenResult = await getMetaToken()
  if (!("status" in tokenResult)) await updateStatus(tokenResult.token, campaign.metaCampaignId, "PAUSED")
  await prisma.adCampaign.update({ where: { id: params.id }, data: { status: "PAUSED" } })
  return NextResponse.json({ ok: true })
}
