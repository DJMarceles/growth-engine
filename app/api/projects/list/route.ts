import { NextRequest, NextResponse } from "next/server"
import { requireOrgRole } from "@/lib/rbac"
import prisma from "@/lib/prisma"

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const orgId = searchParams.get("orgId")
  if (!orgId) return NextResponse.json({ error: "orgId required" }, { status: 400 })
  const access = await requireOrgRole(orgId, "ANALYST")
  if ("status" in access) return access
  const projects = await prisma.project.findMany({
    where: { orgId }, orderBy: { createdAt: "desc" },
    include: { _count: { select: { campaigns: true, experiments: true } } },
  })
  return NextResponse.json({ projects })
}
