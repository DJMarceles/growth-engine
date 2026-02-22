import { NextRequest, NextResponse } from "next/server"
import { requireProjectAccess } from "@/lib/rbac"
import prisma from "@/lib/prisma"

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const exp = await prisma.experiment.findUnique({ where: { id: params.id } })
  if (!exp) return NextResponse.json({ error: "Not found" }, { status: 404 })
  const access = await requireProjectAccess(exp.projectId, "OPERATOR")
  if ("status" in access) return access
  const updated = await prisma.experiment.update({
    where: { id: params.id }, data: { status: "RUNNING", startedAt: new Date() },
  })
  return NextResponse.json({ experiment: updated })
}
