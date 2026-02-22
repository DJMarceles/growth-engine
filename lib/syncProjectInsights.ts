import prisma from "@/lib/prisma"
import { fetchInsights } from "@/lib/metaAds"

export interface SyncProjectInsightsResult {
  stored: number
  campaignCount: number
  errors: string[]
}

export async function syncProjectInsights(
  projectId: string,
  token: string
): Promise<SyncProjectInsightsResult> {
  const until = new Date()
  const since = new Date()
  since.setDate(until.getDate() - 7)

  const fmt = (d: Date) => d.toISOString().split("T")[0]
  const dateRange = { since: fmt(since), until: fmt(until) }

  const campaigns = await prisma.adCampaign.findMany({ where: { projectId } })
  if (campaigns.length === 0) {
    return { stored: 0, campaignCount: 0, errors: [] }
  }

  let totalStored = 0
  const errors: string[] = []

  for (const campaign of campaigns) {
    try {
      const insights = await fetchInsights(token, campaign.metaCampaignId, "campaign", dateRange)

      for (const row of insights as Record<string, unknown>[]) {
        const date = new Date(row.date_start as string)
        await prisma.insightDaily.upsert({
          where: {
            projectId_date_level_entityId: {
              projectId,
              date,
              level: "campaign",
              entityId: campaign.metaCampaignId,
            },
          },
          update: { metrics_json: row as object },
          create: {
            projectId,
            date,
            level: "campaign",
            entityId: campaign.metaCampaignId,
            metrics_json: row as object,
          },
        })
        totalStored++
      }
    } catch (error) {
      errors.push(
        `Campaign ${campaign.name}: ${error instanceof Error ? error.message : String(error)}`
      )
    }
  }

  return { stored: totalStored, campaignCount: campaigns.length, errors }
}
