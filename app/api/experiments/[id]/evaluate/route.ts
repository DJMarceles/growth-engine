import { NextRequest, NextResponse } from "next/server"
import { requireProjectAccess } from "@/lib/rbac"
import prisma from "@/lib/prisma"
import { ExperimentEvaluationError, runExperimentEvaluation } from "@/lib/runExperimentEvaluation"

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const experiment = await prisma.experiment.findUnique({ where: { id: params.id } })
  if (!experiment) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const access = await requireProjectAccess(experiment.projectId, "OPERATOR")
  if ("status" in access) return access

  try {
    const payload = await runExperimentEvaluation(params.id, access.userId)
    return NextResponse.json(payload)
  } catch (error) {
    if (error instanceof ExperimentEvaluationError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    throw error
  }
}
