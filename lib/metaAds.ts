const META_BASE = "https://graph.facebook.com"
const API_VERSION = process.env.META_API_VERSION ?? "v19.0"

async function metaFetch(
  path: string,
  accessToken: string,
  options: RequestInit = {},
  retries = 3
): Promise<unknown> {
  const url = `${META_BASE}/${API_VERSION}/${path}`
  for (let i = 0; i < retries; i++) {
    const res = await fetch(url, {
      ...options,
      headers: { "Content-Type": "application/json", ...(options.headers ?? {}) },
    })
    const data = (await res.json()) as Record<string, unknown>
    if (data.error) {
      const err = data.error as Record<string, unknown>
      if (err.code === 17 || err.code === 32 || err.code === 4) {
        await new Promise((r) => setTimeout(r, Math.pow(2, i + 1) * 1000))
        continue
      }
      throw new Error(mapMetaError(err))
    }
    return data
  }
  throw new Error("Meta API max retries exceeded")
}

function mapMetaError(err: Record<string, unknown>): string {
  const code = err.code as number
  const msg = err.message as string
  const map: Record<number, string> = {
    100: "Invalid parameter. Check your inputs.",
    190: "Access token expired or invalid. Reconnect Meta.",
    200: "Permission error. Check your ad account access.",
    17: "Rate limit hit. Retry in a moment.",
    32: "Rate limit hit (account level).",
    4: "Rate limit hit (application level).",
    368: "Ad account temporarily restricted.",
  }
  return map[code] ?? `Meta error ${code}: ${msg}`
}

export async function listAdAccounts(accessToken: string) {
  const data = (await metaFetch(
    `me/adaccounts?fields=id,name,currency,timezone_name&access_token=${accessToken}`,
    accessToken
  )) as { data: unknown[] }
  return data.data
}

export async function listPixels(accessToken: string, adAccountId: string) {
  const data = (await metaFetch(
    `${adAccountId}/adspixels?fields=id,name&access_token=${accessToken}`,
    accessToken
  )) as { data: unknown[] }
  return data.data
}

export async function createCampaign(
  accessToken: string,
  adAccountId: string,
  params: {
    name: string
    objective: string
    status: string
    dailyBudget?: number
    lifetimeBudget?: number
  }
) {
  const body: Record<string, unknown> = {
    name: params.name,
    objective: params.objective,
    status: params.status,
    access_token: accessToken,
  }
  if (params.dailyBudget) body.daily_budget = params.dailyBudget
  if (params.lifetimeBudget) body.lifetime_budget = params.lifetimeBudget
  return metaFetch(`${adAccountId}/campaigns`, accessToken, {
    method: "POST",
    body: JSON.stringify(body),
  })
}

export async function createAdSet(
  accessToken: string,
  adAccountId: string,
  params: {
    name: string
    campaignId: string
    targeting: Record<string, unknown>
    optimizationGoal: string
    billingEvent: string
    bidStrategy: string
    budgetCents: number
    startTime: string
    endTime?: string
    status: string
  }
) {
  const body: Record<string, unknown> = {
    name: params.name,
    campaign_id: params.campaignId,
    targeting: params.targeting,
    optimization_goal: params.optimizationGoal,
    billing_event: params.billingEvent,
    bid_strategy: params.bidStrategy,
    daily_budget: params.budgetCents,
    start_time: params.startTime,
    status: params.status,
    access_token: accessToken,
  }
  if (params.endTime) body.end_time = params.endTime
  return metaFetch(`${adAccountId}/adsets`, accessToken, {
    method: "POST",
    body: JSON.stringify(body),
  })
}

export async function createCreative(
  accessToken: string,
  adAccountId: string,
  params: { name: string; object_story_spec: Record<string, unknown> }
) {
  return metaFetch(`${adAccountId}/adcreatives`, accessToken, {
    method: "POST",
    body: JSON.stringify({ ...params, access_token: accessToken }),
  })
}

export async function createAd(
  accessToken: string,
  adAccountId: string,
  params: { name: string; adsetId: string; creativeId: string; status: string }
) {
  return metaFetch(`${adAccountId}/ads`, accessToken, {
    method: "POST",
    body: JSON.stringify({
      name: params.name,
      adset_id: params.adsetId,
      creative: { creative_id: params.creativeId },
      status: params.status,
      access_token: accessToken,
    }),
  })
}

export async function updateStatus(
  accessToken: string,
  entityId: string,
  status: "ACTIVE" | "PAUSED"
) {
  return metaFetch(entityId, accessToken, {
    method: "POST",
    body: JSON.stringify({ status, access_token: accessToken }),
  })
}

export async function fetchInsights(
  accessToken: string,
  entityId: string,
  level: "campaign" | "adset" | "ad",
  dateRange: { since: string; until: string }
) {
  const fields = [
    "spend", "impressions", "reach", "frequency",
    "clicks", "cpc", "ctr", "cpm",
    "actions", "cost_per_action_type", "purchase_roas",
  ].join(",")

  const params = new URLSearchParams({
    level,
    fields,
    time_range: JSON.stringify({ since: dateRange.since, until: dateRange.until }),
    time_increment: "1",
    access_token: accessToken,
  })

  const data = (await metaFetch(
    `${entityId}/insights?${params.toString()}`,
    accessToken
  )) as { data: unknown[] }
  return data.data
}
