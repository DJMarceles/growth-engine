import { NextRequest, NextResponse } from "next/server"
import { requireProjectAccess } from "@/lib/rbac"
import prisma from "@/lib/prisma"
import { getMetaToken } from "@/lib/getMetaToken"
import { createCreative } from "@/lib/metaAds"

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { projectId, name, type, assetJson } = body
  const access = await requireProjectAccess(projectId, "OPERATOR")
  if ("status" in access) return access
  const project = await prisma.project.findUnique({ where: { id: projectId } })
  if (!project?.metaAdAccountId) return NextResponse.json({ error: "No ad account" }, { status: 400 })
  const tokenResult = await getMetaToken()
  if ("status" in tokenResult) return tokenResult
  const meta = await createCreative(tokenResult.token, project.metaAdAccountId, { name, object_story_spec: assetJson }) as { id: string }
  const creative = await prisma.adCreative.create({
    data: { projectId, metaCreativeId: meta.id, name, type, asset_json: assetJson },
  })
  return NextResponse.json({ creative })
}
