import { NextRequest, NextResponse } from "next/server"
import { requireOrgRole } from "@/lib/rbac"
import prisma from "@/lib/prisma"

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const access = await requireOrgRole(params.id, "ANALYST")
  if ("status" in access) return access
  const members = await prisma.membership.findMany({
    where: { orgId: params.id },
    include: { user: { select: { id: true, name: true, email: true } } },
  })
  return NextResponse.json({ members })
}
