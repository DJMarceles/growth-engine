import { NextRequest, NextResponse } from "next/server"
import { requireProjectAccess } from "@/lib/rbac"
import prisma from "@/lib/prisma"
import { tickExperiment } from "@/lib/experimentEngine"

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const exp = await prisma.experiment.findUnique({ where: { id: params.id } })
  if (!exp) return NextResponse.json({ error: "Not found" }, { status: 404 })
  const access = await requireProjectAccess(exp.projectId, "OPERATOR")
  if ("status" in access) return access
  const result = await tickExperiment(params.id)
  return NextResponse.json(result)
}
