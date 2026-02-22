import { NextRequest, NextResponse } from "next/server"
import { requireProjectAccess } from "@/lib/rbac"
import prisma from "@/lib/prisma"

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const exp = await prisma.experiment.findUnique({ where: { id: params.id }, include: { runs: true } })
  if (!exp) return NextResponse.json({ error: "Not found" }, { status: 404 })
  const access = await requireProjectAccess(exp.projectId)
  if ("status" in access) return access
  const [snapshots, decisions] = await Promise.all([
    prisma.evidenceSnapshot.findMany({ where: { experimentId: params.id } }),
    prisma.decisionLog.findMany({ where: { projectId: exp.projectId }, orderBy: { createdAt: "desc" } }),
  ])
  return NextResponse.json({ experiment: exp, runs: exp.runs, evidenceSnapshots: snapshots, decisions, exportedAt: new Date().toISOString() })
}
