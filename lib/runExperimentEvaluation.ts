import prisma from "@/lib/prisma"
import { evaluateSignificance, type VariantSample } from "@/lib/significance"

export class ExperimentEvaluationError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = "ExperimentEvaluationError"
    this.status = status
  }
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === "object") return value as Record<string, unknown>
  return null
}

function toCount(value: unknown): number {
  const n = Number(value)
  if (!Number.isFinite(n) || n < 0) return 0
  return Math.floor(n)
}

function extractVariantSample(value: unknown): VariantSample {
  const variant = asRecord(value) ?? {}
  const metrics = asRecord(variant.metrics) ?? {}
  return {
    impressions: toCount(metrics.impressions ?? variant.impressions),
    clicks: toCount(metrics.clicks ?? variant.clicks),
    conversions: toCount(metrics.conversions ?? variant.conversions),
  }
}

function extractVariantId(value: unknown, fallback: string): string {
  const variant = asRecord(value)
  if (!variant) return fallback
  if (typeof variant.variant_id === "string" && variant.variant_id.length > 0) return variant.variant_id
  if (typeof variant.id === "string" && variant.id.length > 0) return variant.id
  return fallback
}

export async function runExperimentEvaluation(experimentId: string, createdByUserId?: string) {
  const experiment = await prisma.experiment.findUnique({ where: { id: experimentId } })
  if (!experiment) throw new ExperimentEvaluationError(404, "Not found")

  if (!Array.isArray(experiment.variants_json) || experiment.variants_json.length !== 2) {
    throw new ExperimentEvaluationError(400, "Experiment requires exactly two variants to evaluate.")
  }

  const [variantA, variantB] = experiment.variants_json
  const sampleA = extractVariantSample(variantA)
  const sampleB = extractVariantSample(variantB)
  const result = evaluateSignificance(sampleA, sampleB)

  const variantAId = extractVariantId(variantA, "A")
  const variantBId = extractVariantId(variantB, "B")
  const winnerVariantId =
    result.winner === "a" ? variantAId : result.winner === "b" ? variantBId : null

  const log = await prisma.decisionLog.create({
    data: {
      projectId: experiment.projectId,
      decisionType: "EXPERIMENT_CONCLUDED",
      decision_json: {
        experimentId: experiment.id,
        winner: result.winner,
        winnerVariantId,
        confidence: result.confidence,
        recommendation: result.recommendation,
        variants: {
          a: { variantId: variantAId, ...sampleA },
          b: { variantId: variantBId, ...sampleB },
        },
      },
      evidenceRefs_json: [],
      model: "chi-square-v1",
      createdByUserId: createdByUserId ?? null,
      createdByAgentName: "experiment-evaluate",
    },
  })

  const updatedExperiment = result.winner
    ? await prisma.experiment.update({
        where: { id: experiment.id },
        data: { status: "COMPLETED", endedAt: new Date() },
      })
    : experiment

  return { result, experiment: updatedExperiment, log }
}
