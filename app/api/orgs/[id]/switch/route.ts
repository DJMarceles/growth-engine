import { NextRequest, NextResponse } from "next/server"
import { requireOrgRole } from "@/lib/rbac"
import prisma from "@/lib/prisma"

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const access = await requireOrgRole(params.id, "ANALYST")
  if ("status" in access) return access
  const org = await prisma.organization.findUnique({ where: { id: params.id } })
  return NextResponse.json({ org })
}
