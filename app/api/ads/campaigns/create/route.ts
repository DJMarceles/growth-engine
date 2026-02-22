import { NextRequest, NextResponse } from "next/server"
import { requireProjectAccess } from "@/lib/rbac"
import prisma from "@/lib/prisma"
import { getMetaToken } from "@/lib/getMetaToken"
import { createCampaign } from "@/lib/metaAds"

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { projectId, name, objective, status, dailyBudgetCents, lifetimeBudgetCents } = body

  if (!projectId || !name) {
    return NextResponse.json({ error: "projectId and name are required" }, { status: 400 })
  }

  const access = await requireProjectAccess(projectId, "OPERATOR")
  if ("status" in access) return access

  const project = await prisma.project.findUnique({ where: { id: projectId } })
  if (!project?.metaAdAccountId) {
    return NextResponse.json({ error: "No Meta ad account linked. Go to Settings to link one." }, { status: 400 })
  }

  const tokenResult = await getMetaToken()
  if ("status" in tokenResult) {
    return NextResponse.json({ error: "Meta token not available. Reconnect Meta in Settings." }, { status: 401 })
  }

  let metaCampaignId: string
  let stub = false

  try {
    const meta = await createCampaign(tokenResult.token, project.metaAdAccountId, {
      name, objective, status: status ?? "PAUSED",
      dailyBudget: dailyBudgetCents, lifetimeBudget: lifetimeBudgetCents,
    }) as { id: string }
    metaCampaignId = meta.id
  } catch (err) {
    // Store locally with stub ID so UI is usable even if Meta API fails
    metaCampaignId = `stub_${Date.now()}`
    stub = true
    console.error("Meta campaign create failed, using stub:", err)
  }

  const campaign = await prisma.adCampaign.create({
    data: {
      projectId,
      metaCampaignId,
      name,
      objective,
      status: status ?? "PAUSED",
      dailyBudgetCents,
      lifetimeBudgetCents,
    },
  })

  return NextResponse.json({ campaign, stub, warning: stub ? "Campaign saved locally — Meta API call failed. Check your ad account permissions." : undefined })
}
