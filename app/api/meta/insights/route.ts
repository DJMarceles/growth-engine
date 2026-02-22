import { NextRequest, NextResponse } from "next/server"
import { requireProjectAccess } from "@/lib/rbac"
import prisma from "@/lib/prisma"
import { getMetaToken } from "@/lib/getMetaToken"
import { fetchInsights } from "@/lib/metaAds"

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { projectId, entityId, level, since, until } = body
  const access = await requireProjectAccess(projectId)
  if ("status" in access) return access
  const tokenResult = await getMetaToken()
  if ("status" in tokenResult) return tokenResult
  const insights = await fetchInsights(tokenResult.token, entityId, level, { since, until })
  for (const row of insights as Record<string, unknown>[]) {
    const date = new Date(row.date_start as string)
    await prisma.insightDaily.upsert({
      where: { projectId_date_level_entityId: { projectId, date, level, entityId } },
      update: { metrics_json: row as object },
      create: { projectId, date, level, entityId, metrics_json: row as object },
    })
  }
  return NextResponse.json({ stored: insights.length })
}
