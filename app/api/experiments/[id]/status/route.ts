import { NextRequest, NextResponse } from "next/server"
import { requireProjectAccess } from "@/lib/rbac"
import prisma from "@/lib/prisma"

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const exp = await prisma.experiment.findUnique({
    where: { id: params.id },
    include: { runs: { orderBy: { createdAt: "desc" }, take: 1 } },
  })
  if (!exp) return NextResponse.json({ error: "Not found" }, { status: 404 })
  const access = await requireProjectAccess(exp.projectId)
  if ("status" in access) return access
  return NextResponse.json({ experiment: exp, latestRun: exp.runs[0] ?? null })
}
