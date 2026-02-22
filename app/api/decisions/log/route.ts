import { NextRequest, NextResponse } from "next/server"
import { requireProjectAccess } from "@/lib/rbac"
import prisma from "@/lib/prisma"

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { projectId, decisionType, decisionData, evidenceRefs, promptHash, model, agentName } = body
  const access = await requireProjectAccess(projectId, "OPERATOR")
  if ("status" in access) return access
  const log = await prisma.decisionLog.create({
    data: {
      projectId, decisionType, decision_json: decisionData,
      evidenceRefs_json: evidenceRefs ?? [], promptHash: promptHash ?? null,
      model: model ?? null, createdByUserId: access.userId, createdByAgentName: agentName ?? null,
    },
  })
  return NextResponse.json({ log })
}
