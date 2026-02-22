import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import prisma from "@/lib/prisma"
import { OrgRole } from "@prisma/client"
import { NextResponse } from "next/server"

const ROLE_HIERARCHY: Record<OrgRole, number> = {
  OWNER: 4,
  ADMIN: 3,
  OPERATOR: 2,
  ANALYST: 1,
}

export async function requireOrgRole(
  orgId: string,
  minRole: OrgRole = "ANALYST"
): Promise<{ userId: string } | NextResponse> {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const user = await prisma.user.findUnique({ where: { id: session.user.id } })
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 401 })

  const membership = await prisma.membership.findUnique({
    where: { userId_orgId: { userId: user.id, orgId } },
  })
  if (!membership) return NextResponse.json({ error: "Not a member" }, { status: 403 })
  if (ROLE_HIERARCHY[membership.role] < ROLE_HIERARCHY[minRole]) {
    return NextResponse.json({ error: "Insufficient role" }, { status: 403 })
  }
  return { userId: user.id }
}

export async function requireProjectAccess(
  projectId: string,
  minRole: OrgRole = "ANALYST"
): Promise<{ userId: string; project: { orgId: string; id: string } } | NextResponse> {
  const project = await prisma.project.findUnique({ where: { id: projectId } })
  if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 })
  const result = await requireOrgRole(project.orgId, minRole)
  if (result instanceof NextResponse) return result
  return { userId: result.userId, project }
}
