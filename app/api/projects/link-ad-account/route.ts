import { NextRequest, NextResponse } from "next/server"
import { requireProjectAccess } from "@/lib/rbac"
import prisma from "@/lib/prisma"

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { projectId, adAccountId, adAccountName } = body
  const access = await requireProjectAccess(projectId, "OPERATOR")
  if ("status" in access) return access
  await prisma.project.update({ where: { id: projectId }, data: { metaAdAccountId: adAccountId } })
  const existing = await prisma.metaAdAccount.findFirst({ where: { projectId, adAccountId } })
  if (!existing) {
    await prisma.metaAdAccount.create({
      data: { projectId, adAccountId, name: adAccountName ?? adAccountId, currency: "EUR", timezone: "Europe/Amsterdam" },
    })
  }
  return NextResponse.json({ ok: true })
}
