import { NextRequest, NextResponse } from "next/server"
import { requireProjectAccess } from "@/lib/rbac"
import prisma from "@/lib/prisma"
import { getMetaToken } from "@/lib/getMetaToken"
import { syncProjectInsights } from "@/lib/syncProjectInsights"

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { projectId } = body

  if (!projectId) return NextResponse.json({ error: "projectId required" }, { status: 400 })

  const access = await requireProjectAccess(projectId)
  if ("status" in access) return access

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { metaAdAccountId: true },
  })

  if (!project?.metaAdAccountId) {
    return NextResponse.json({ error: "No Meta ad account linked to this project" }, { status: 400 })
  }

  const tokenResult = await getMetaToken()
  if ("status" in tokenResult) return tokenResult

  const result = await syncProjectInsights(projectId, tokenResult.token)
  if (result.campaignCount === 0) {
    return NextResponse.json({ stored: 0, message: "No campaigns found — create a campaign first" })
  }

  const message = result.errors.length > 0
    ? `Synced ${result.stored} rows. Errors: ${result.errors.join("; ")}`
    : `Synced ${result.stored} rows across ${result.campaignCount} campaign(s)`

  return NextResponse.json({ stored: result.stored, message })
}
