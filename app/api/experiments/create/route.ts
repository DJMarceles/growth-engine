import { NextRequest, NextResponse } from "next/server"
import { requireProjectAccess } from "@/lib/rbac"
import prisma from "@/lib/prisma"

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { projectId, name, type, hypothesis, variants, decisionRules } = body
  const access = await requireProjectAccess(projectId, "OPERATOR")
  if ("status" in access) return access
  const experiment = await prisma.experiment.create({
    data: { projectId, name, type, hypothesis, variants_json: variants, decisionRules_json: decisionRules },
  })
  return NextResponse.json({ experiment })
}
