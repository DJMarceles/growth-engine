import { NextRequest, NextResponse } from "next/server"
import { requireProjectAccess } from "@/lib/rbac"
import prisma from "@/lib/prisma"

export async function GET(req: NextRequest, { params }: { params: { projectId: string } }) {
  const access = await requireProjectAccess(params.projectId)
  if ("status" in access) return access
  const [project, experiments, decisions, snapshots, insights] = await Promise.all([
    prisma.project.findUnique({ where: { id: params.projectId } }),
    prisma.experiment.findMany({ where: { projectId: params.projectId }, include: { runs: true } }),
    prisma.decisionLog.findMany({ where: { projectId: params.projectId } }),
    prisma.evidenceSnapshot.findMany({ where: { projectId: params.projectId } }),
    prisma.insightDaily.findMany({ where: { projectId: params.projectId }, take: 1000 }),
  ])
  const blob = { project, experiments, decisions, evidenceSnapshots: snapshots, insights, exportedAt: new Date().toISOString() }
  return new NextResponse(JSON.stringify(blob, null, 2), {
    headers: { "Content-Type": "application/json", "Content-Disposition": `attachment; filename="governance-${params.projectId}.json"` },
  })
}
