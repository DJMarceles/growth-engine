import { NextRequest, NextResponse } from "next/server"
import { requireOrgRole } from "@/lib/rbac"
import prisma from "@/lib/prisma"

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { name, orgId } = body
  const access = await requireOrgRole(orgId, "OPERATOR")
  if ("status" in access) return access
  const project = await prisma.project.create({ data: { name, orgId } })
  return NextResponse.json({ project })
}
