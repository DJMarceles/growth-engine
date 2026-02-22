import { NextRequest, NextResponse } from "next/server"
import { Prisma } from "@prisma/client"
import { requireProjectAccess } from "@/lib/rbac"
import prisma from "@/lib/prisma"
import { getMetaToken } from "@/lib/getMetaToken"
import { createAd } from "@/lib/metaAds"

type CreativeInput = {
  title: string
  body: string
  imageUrl: string
  linkUrl: string
}

function isValidCreative(creative: unknown): creative is CreativeInput {
  if (!creative || typeof creative !== "object") return false
  const value = creative as Partial<CreativeInput>
  return (
    typeof value.title === "string" &&
    typeof value.body === "string" &&
    typeof value.imageUrl === "string" &&
    typeof value.linkUrl === "string"
  )
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { projectId, adSetId, name, creative, status } = body as {
    projectId?: string
    adSetId?: string
    name?: string
    creative?: unknown
    status?: string
  }

  if (!adSetId || !name || !creative) {
    return NextResponse.json({ error: "adSetId, name and creative are required" }, { status: 400 })
  }
  if (!isValidCreative(creative)) {
    return NextResponse.json(
      { error: "creative must include title, body, imageUrl and linkUrl" },
      { status: 400 }
    )
  }

  const adSet = await prisma.adSet.findUnique({ where: { id: adSetId } })
  if (!adSet) return NextResponse.json({ error: "AdSet not found" }, { status: 404 })

  const resolvedProjectId = projectId ?? adSet.projectId
  if (projectId && projectId !== adSet.projectId) {
    return NextResponse.json({ error: "adSetId does not belong to projectId" }, { status: 400 })
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

  let metaAdId: string
  let metaCreativeId: string
  let stub = false

  try {
    const meta = (await createAd(tokenResult.token, project.metaAdAccountId, {
      name,
      adsetId: adSet.metaAdSetId,
      creative,
      status: status ?? "PAUSED",
    })) as { id: string; creativeId: string }

    metaAdId = meta.id
    metaCreativeId = meta.creativeId
  } catch (err) {
    const stubBase = Date.now()
    metaAdId = `stub_${stubBase}`
    metaCreativeId = `stub_${stubBase}_creative`
    stub = true
    console.error("Meta ad create failed, using stub:", err)
  }

  const creativeRecord = await prisma.adCreative.create({
    data: {
      projectId: resolvedProjectId,
      metaCreativeId,
      name: creative.title,
      type: "LINK_AD",
      asset_json: creative as Prisma.InputJsonValue,
    },
  })

  const ad = await prisma.ad.create({
    data: {
      projectId: resolvedProjectId,
      adSetId,
      creativeId: creativeRecord.id,
      metaAdId,
      name,
      status: status ?? "PAUSED",
    },
  })

  return NextResponse.json({
    ad,
    creative: creativeRecord,
    stub,
    warning: stub ? "Ad saved locally — Meta API call failed. Check your ad account permissions." : undefined,
  })
}
