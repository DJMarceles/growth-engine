import { NextRequest, NextResponse } from "next/server"
import { requireProjectAccess } from "@/lib/rbac"
import prisma from "@/lib/prisma"

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const projectId = searchParams.get("projectId")!
  const access = await requireProjectAccess(projectId)
  if ("status" in access) return access
  const snapshots = await prisma.evidenceSnapshot.findMany({
    where: { projectId }, orderBy: { createdAt: "desc" }, take: 100,
    select: { id: true, source: true, experimentId: true, createdAt: true },
  })
  return NextResponse.json({ snapshots })
}
