import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import prisma from "@/lib/prisma"

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const user = await prisma.user.findUnique({ where: { id: session.user.id } })
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 401 })
  const body = await req.json()
  const { name, type, parentOrgId } = body
  const org = await prisma.organization.create({
    data: { name, type: type ?? "CLIENT", parentOrgId: parentOrgId ?? null },
  })
  await prisma.membership.create({ data: { userId: user.id, orgId: org.id, role: "OWNER" } })
  return NextResponse.json({ org })
}
