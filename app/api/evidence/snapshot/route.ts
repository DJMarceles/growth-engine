import { NextRequest, NextResponse } from "next/server"
import { requireProjectAccess } from "@/lib/rbac"
import prisma from "@/lib/prisma"

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { projectId, experimentId, source, snapshotData } = body
  const access = await requireProjectAccess(projectId, "OPERATOR")
  if ("status" in access) return access
  const snapshot = await prisma.evidenceSnapshot.create({
    data: { projectId, experimentId: experimentId ?? null, source, snapshot_json: snapshotData },
  })
  return NextResponse.json({ snapshot })
}
