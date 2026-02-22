import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { ExperimentEvaluationError, runExperimentEvaluation } from "@/lib/runExperimentEvaluation"
import { requireCronSecret } from "@/lib/cronAuth"

export async function GET(req: NextRequest) {
  const unauthorized = requireCronSecret(req)
  if (unauthorized) return unauthorized

  const experiments = await prisma.experiment.findMany({
    where: { status: "RUNNING" },
    select: { id: true },
  })

  let processed = 0
  const errors: string[] = []

  for (const experiment of experiments) {
    processed++

    try {
      await runExperimentEvaluation(experiment.id)
    } catch (error) {
      if (error instanceof ExperimentEvaluationError) {
        errors.push(`Experiment ${experiment.id}: ${error.message}`)
        continue
      }
      errors.push(
        `Experiment ${experiment.id}: ${error instanceof Error ? error.message : String(error)}`
      )
    }
  }

  return NextResponse.json({ processed, errors })
}
