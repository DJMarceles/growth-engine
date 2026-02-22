import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { requireCronSecret } from "@/lib/cronAuth"
import { getMetaTokenForOrg } from "@/lib/getMetaToken"
import { syncProjectInsights } from "@/lib/syncProjectInsights"

export async function GET(req: NextRequest) {
  const unauthorized = requireCronSecret(req)
  if (unauthorized) return unauthorized

  const projects = await prisma.project.findMany({
    where: { metaAdAccountId: { not: null } },
    select: { id: true, orgId: true },
  })

  let processed = 0
  const errors: string[] = []
  const tokenCache = new Map<string, Awaited<ReturnType<typeof getMetaTokenForOrg>>>()

  for (const project of projects) {
    processed++

    try {
      let tokenResult = tokenCache.get(project.orgId)
      if (!tokenResult) {
        tokenResult = await getMetaTokenForOrg(project.orgId)
        tokenCache.set(project.orgId, tokenResult)
      }

      if ("error" in tokenResult) {
        errors.push(`Project ${project.id}: ${tokenResult.error}`)
        continue
      }

      const result = await syncProjectInsights(project.id, tokenResult.token)

      for (const error of result.errors) {
        errors.push(`Project ${project.id}: ${error}`)
      }
    } catch (error) {
      errors.push(`Project ${project.id}: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  return NextResponse.json({ processed, errors })
}
