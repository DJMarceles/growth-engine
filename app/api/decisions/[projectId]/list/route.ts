import { NextRequest, NextResponse } from "next/server"
import { requireProjectAccess } from "@/lib/rbac"
import prisma from "@/lib/prisma"

export async function GET(req: NextRequest, { params }: { params: { projectId: string } }) {
  const access = await requireProjectAccess(params.projectId)
  if ("status" in access) return access
  const decisions = await prisma.decisionLog.findMany({
    where: { projectId: params.projectId }, orderBy: { createdAt: "desc" }, take: 100,
  })
  return NextResponse.json({ decisions })
}
