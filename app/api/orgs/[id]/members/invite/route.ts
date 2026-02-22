import { NextRequest, NextResponse } from "next/server"
import { requireOrgRole } from "@/lib/rbac"
import prisma from "@/lib/prisma"

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const access = await requireOrgRole(params.id, "ADMIN")
  if ("status" in access) return access
  const { email, role } = await req.json()
  const invitee = await prisma.user.findUnique({ where: { email } })
  if (!invitee) return NextResponse.json({ error: "User not found. They must sign up first." }, { status: 404 })
  const membership = await prisma.membership.upsert({
    where: { userId_orgId: { userId: invitee.id, orgId: params.id } },
    update: { role }, create: { userId: invitee.id, orgId: params.id, role },
  })
  return NextResponse.json({ membership })
}
