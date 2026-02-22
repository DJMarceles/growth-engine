import { NextRequest, NextResponse } from "next/server"
import { requireProjectAccess } from "@/lib/rbac"
import prisma from "@/lib/prisma"
import { getMetaToken } from "@/lib/getMetaToken"
import { createAd } from "@/lib/metaAds"

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { projectId, adSetId, creativeId, name, status } = body
  const access = await requireProjectAccess(projectId, "OPERATOR")
  if ("status" in access) return access
  const project = await prisma.project.findUnique({ where: { id: projectId } })
  if (!project?.metaAdAccountId) return NextResponse.json({ error: "No ad account" }, { status: 400 })
  const adSet = await prisma.adSet.findUnique({ where: { id: adSetId } })
  const creative = await prisma.adCreative.findUnique({ where: { id: creativeId } })
  if (!adSet || !creative) return NextResponse.json({ error: "AdSet or Creative not found" }, { status: 404 })
  const tokenResult = await getMetaToken()
  if ("status" in tokenResult) return tokenResult
  const meta = await createAd(tokenResult.token, project.metaAdAccountId, {
    name, adsetId: adSet.metaAdSetId, creativeId: creative.metaCreativeId, status: status ?? "PAUSED",
  }) as { id: string }
  const ad = await prisma.ad.create({
    data: { projectId, adSetId, creativeId, metaAdId: meta.id, name, status: status ?? "PAUSED" },
  })
  return NextResponse.json({ ad })
}
