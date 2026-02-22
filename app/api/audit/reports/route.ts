import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { requireProjectAccess } from "@/lib/rbac"

export async function GET(req: NextRequest) {
  const projectId = req.nextUrl.searchParams.get("projectId")
  if (!projectId) {
    return NextResponse.json({ error: "projectId is required" }, { status: 400 })
  }

  const access = await requireProjectAccess(projectId)
  if ("status" in access) return access

  const reports = await prisma.auditReport.findMany({
    where: { projectId },
    orderBy: { generatedAt: "desc" },
  })

  return NextResponse.json({ reports })
}
