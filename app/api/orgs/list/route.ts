import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import prisma from "@/lib/prisma"

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const user = await prisma.user.findUnique({ where: { id: session.user.id } })
  if (!user) return NextResponse.json({ orgs: [] })
  const memberships = await prisma.membership.findMany({
    where: { userId: user.id }, include: { org: true },
  })
  return NextResponse.json({ orgs: memberships.map((m) => ({ ...m.org, role: m.role })) })
}
