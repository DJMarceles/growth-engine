import { NextRequest, NextResponse } from "next/server"
import { Prisma } from "@prisma/client"
import { requireProjectAccess } from "@/lib/rbac"
import prisma from "@/lib/prisma"
import { getMetaToken } from "@/lib/getMetaToken"
import { createAdSet } from "@/lib/metaAds"

type TargetingInput = {
  age_min: number
  age_max: number
  genders: number[]
  geo_locations: Record<string, unknown>
}

function isValidTargeting(targeting: unknown): targeting is TargetingInput {
  if (!targeting || typeof targeting !== "object") return false

  const value = targeting as Partial<TargetingInput>
  return (
    typeof value.age_min === "number" &&
    typeof value.age_max === "number" &&
    value.age_min <= value.age_max &&
    Array.isArray(value.genders) &&
    value.genders.every((gender) => typeof gender === "number") &&
    !!value.geo_locations &&
    typeof value.geo_locations === "object"
  )
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const {
    projectId,
    campaignId,
    name,
    dailyBudget,
    targeting,
    optimization_goal,
    billing_event,
    status,
  } = body as {
    projectId?: string
    campaignId?: string
    name?: string
    dailyBudget?: number
    targeting?: unknown
    optimization_goal?: string
    billing_event?: string
    status?: string
  }

  if (!campaignId || !name || dailyBudget == null || !optimization_goal || !billing_event) {
    return NextResponse.json(
      { error: "campaignId, name, dailyBudget, targeting, optimization_goal and billing_event are required" },
      { status: 400 }
    )
  }
  if (!isValidTargeting(targeting)) {
    return NextResponse.json(
      { error: "targeting must include age_min, age_max, genders and geo_locations" },
      { status: 400 }
    )
  }

  const parsedDailyBudget = Number(dailyBudget)
  if (!Number.isFinite(parsedDailyBudget) || parsedDailyBudget <= 0) {
    return NextResponse.json({ error: "dailyBudget must be a positive number" }, { status: 400 })
  }

  const campaign = await prisma.adCampaign.findUnique({ where: { id: campaignId } })
  if (!campaign) return NextResponse.json({ error: "Campaign not found" }, { status: 404 })

  const resolvedProjectId = projectId ?? campaign.projectId
  if (projectId && projectId !== campaign.projectId) {
    return NextResponse.json({ error: "campaignId does not belong to projectId" }, { status: 400 })
  }

  const access = await requireProjectAccess(resolvedProjectId, "OPERATOR")
  if ("status" in access) return access

  const project = await prisma.project.findUnique({ where: { id: resolvedProjectId } })
  if (!project?.metaAdAccountId) {
    return NextResponse.json({ error: "No Meta ad account linked. Go to Settings to link one." }, { status: 400 })
  }

  const tokenResult = await getMetaToken()
  if ("status" in tokenResult) {
    return NextResponse.json({ error: "Meta token not available. Reconnect Meta in Settings." }, { status: 401 })
  }

  let metaAdSetId: string
  let stub = false

  try {
    const meta = (await createAdSet(tokenResult.token, project.metaAdAccountId, {
      name,
      campaignId: campaign.metaCampaignId,
      dailyBudget: parsedDailyBudget,
      targeting,
      optimization_goal,
      billing_event,
      status: status ?? "PAUSED",
    })) as { id: string }
    metaAdSetId = meta.id
  } catch (err) {
    metaAdSetId = `stub_${Date.now()}`
    stub = true
    console.error("Meta ad set create failed, using stub:", err)
  }

  const adSet = await prisma.adSet.create({
    data: {
      projectId: resolvedProjectId,
      campaignId,
      metaAdSetId,
      name,
      targeting_json: targeting as Prisma.InputJsonValue,
      optimizationGoal: optimization_goal,
      billingEvent: billing_event,
      bidStrategy: "LOWEST_COST_WITHOUT_CAP",
      budgetCents: Math.round(parsedDailyBudget),
      startTime: new Date(),
      endTime: null,
      status: status ?? "PAUSED",
    },
  })

  return NextResponse.json({
    adSet,
    stub,
    warning: stub ? "Ad set saved locally — Meta API call failed. Check your ad account permissions." : undefined,
  })
}
