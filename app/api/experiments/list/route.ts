import { NextRequest, NextResponse } from "next/server"
import { requireProjectAccess } from "@/lib/rbac"
import prisma from "@/lib/prisma"

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const projectId = searchParams.get("projectId")!
  const access = await requireProjectAccess(projectId)
  if ("status" in access) return access
  const experiments = await prisma.experiment.findMany({
    where: { projectId }, orderBy: { createdAt: "desc" },
    include: { runs: { orderBy: { createdAt: "desc" }, take: 1 } },
  })
  return NextResponse.json({ experiments })
}
