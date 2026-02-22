import { PrismaClient } from "@prisma/client"
const prisma = new PrismaClient()
const BASE_URL = process.env.APP_BASE_URL ?? "http://localhost:3000"
const TICK_INTERVAL_MS = 5 * 60 * 1000
const INSIGHT_INTERVAL_MS = 60 * 60 * 1000

async function tickAllExperiments() {
  const running = await prisma.experiment.findMany({ where: { status: "RUNNING" } })
  console.log(`[worker] Ticking ${running.length} experiments`)
  for (const exp of running) {
    try {
      const res = await fetch(`${BASE_URL}/api/experiments/${exp.id}/tick`, { method: "POST" })
      const data = await res.json()
      console.log(`[worker] ${exp.id}:`, data.decision?.action ?? "no decision")
    } catch (e) { console.error(`[worker] Tick failed ${exp.id}:`, e) }
  }
}

async function backfillInsights() {
  const projects = await prisma.project.findMany({ where: { metaAdAccountId: { not: null } } })
  const until = new Date().toISOString().split("T")[0]
  const since = new Date(Date.now() - 7 * 86400000).toISOString().split("T")[0]
  for (const project of projects) {
    const campaigns = await prisma.adCampaign.findMany({ where: { projectId: project.id } })
    for (const campaign of campaigns) {
      try {
        await fetch(`${BASE_URL}/api/meta/insights`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ projectId: project.id, entityId: campaign.metaCampaignId, level: "campaign", since, until }),
        })
      } catch (e) { console.error(`[worker] Insight backfill failed ${campaign.id}:`, e) }
    }
  }
}

async function main() {
  console.log("[worker] Starting")
  await tickAllExperiments()
  await backfillInsights()
  setInterval(tickAllExperiments, TICK_INTERVAL_MS)
  setInterval(backfillInsights, INSIGHT_INTERVAL_MS)
}

main().catch(console.error)
