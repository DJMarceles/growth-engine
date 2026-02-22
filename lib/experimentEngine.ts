import prisma from "@/lib/prisma"
import { computePromptHash } from "./promptHash"

interface DecisionRules {
  primaryMetric: "CTR" | "CPA"
  minSpendCents: number
  minImpressions: number
  maxDays: number
  stopLossCpaCents?: number
  winnerThresholdPercent?: number
}

interface Variant {
  variant_id: string
  variant_type: string
  payload_json: Record<string, unknown>
  allocation_percent: number
  metaEntityId?: string
}

export async function tickExperiment(experimentId: string): Promise<Record<string, unknown>> {
  const experiment = await prisma.experiment.findUnique({
    where: { id: experimentId },
    include: { project: true },
  })
  if (!experiment || experiment.status !== "RUNNING") {
    return { skipped: true, reason: "Not running" }
  }

  const variants = experiment.variants_json as Variant[]
  const rules = experiment.decisionRules_json as DecisionRules
  const startDate = experiment.startedAt ?? new Date()

  const variantResults = await Promise.all(
    variants.map(async (v) => {
      if (!v.metaEntityId) return { ...v, metrics: null }
      const insights = await prisma.insightDaily.findMany({
        where: { projectId: experiment.projectId, entityId: v.metaEntityId, date: { gte: startDate } },
      })
      const agg = insights.reduce(
        (acc, row) => {
          const m = row.metrics_json as Record<string, number>
          acc.spend += Number(m.spend ?? 0)
          acc.impressions += Number(m.impressions ?? 0)
          acc.clicks += Number(m.clicks ?? 0)
          acc.conversions += Number(m.conversions ?? 0)
          return acc
        },
        { spend: 0, impressions: 0, clicks: 0, conversions: 0 }
      )
      return {
        ...v,
        metrics: {
          ...agg,
          CTR: agg.impressions > 0 ? agg.clicks / agg.impressions : 0,
          CPA: agg.conversions > 0 ? agg.spend / agg.conversions : null,
        },
      }
    })
  )

  const ready = variantResults.filter(
    (v) =>
      v.metrics &&
      v.metrics.spend * 100 >= rules.minSpendCents &&
      v.metrics.impressions >= rules.minImpressions
  )

  let decision: Record<string, unknown> = { action: "WAIT", reason: "Insufficient data" }

  if (ready.length === variantResults.length && ready.length >= 2) {
    const metric = rules.primaryMetric
    const sorted = [...ready].sort((a, b) => {
      const am = a.metrics![metric] ?? Infinity
      const bm = b.metrics![metric] ?? Infinity
      return metric === "CTR" ? bm - am : am - bm
    })
    const winner = sorted[0]
    const loser = sorted[sorted.length - 1]
    const winnerVal = winner.metrics![metric] as number
    const loserVal = loser.metrics![metric] as number
    const improvement =
      metric === "CTR"
        ? ((winnerVal - loserVal) / loserVal) * 100
        : ((loserVal - winnerVal) / loserVal) * 100

    if (
      rules.stopLossCpaCents &&
      metric === "CPA" &&
      loser.metrics!.CPA &&
      loser.metrics!.CPA * 100 > rules.stopLossCpaCents
    ) {
      decision = { action: "KILL", variantId: loser.variant_id, reason: "Stop loss triggered", improvement }
    } else if (rules.winnerThresholdPercent && improvement >= rules.winnerThresholdPercent) {
      decision = { action: "SCALE", variantId: winner.variant_id, reason: `Winner by ${improvement.toFixed(1)}%`, improvement, scaleFactor: 1.5 }
    } else {
      decision = { action: "ITERATE", reason: "No clear winner yet", improvement, leadingVariant: winner.variant_id }
    }

    const daysSinceStart = (Date.now() - startDate.getTime()) / 86400000
    if (daysSinceStart >= rules.maxDays && decision.action === "ITERATE") {
      decision = { action: "STOP", reason: "Max days reached without clear winner", leadingVariant: winner.variant_id }
    }
  }

  const snapshot = await prisma.evidenceSnapshot.create({
    data: {
      projectId: experiment.projectId,
      experimentId: experiment.id,
      source: "meta_insights",
      snapshot_json: { variantResults, timestamp: new Date().toISOString() },
    },
  })

  const promptHash = computePromptHash({
    systemPrompt: "experiment-tick-engine-v1",
    userInput: { experimentId, rules, variantResults },
    model: "deterministic",
  })

  const run = await prisma.experimentRun.create({
    data: {
      experimentId: experiment.id,
      status: decision.action as string,
      allocations_json: variants.map((v) => ({ variantId: v.variant_id, allocation: v.allocation_percent })),
      results_json: variantResults,
      decision_json: decision,
    },
  })

  await prisma.decisionLog.create({
    data: {
      projectId: experiment.projectId,
      decisionType: decision.action as string,
      decision_json: decision,
      evidenceRefs_json: { snapshotIds: [snapshot.id], runId: run.id },
      promptHash,
      model: "experiment-engine-v1",
      createdByAgentName: "experiment-tick",
    },
  })

  if (["KILL", "SCALE", "STOP"].includes(decision.action as string)) {
    await prisma.experiment.update({
      where: { id: experimentId },
      data: { status: "COMPLETED", endedAt: new Date() },
    })
  }

  return { decision, snapshotId: snapshot.id, runId: run.id }
}
