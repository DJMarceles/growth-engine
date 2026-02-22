import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { requireProjectAccess } from "@/lib/rbac"

interface ConversionInput {
  campaignId: string
  date: string
  conversions: number
  revenue: number
  source: string
}

function isValidRow(row: unknown): row is ConversionInput {
  if (!row || typeof row !== "object") return false
  const record = row as Record<string, unknown>
  return (
    typeof record.campaignId === "string" &&
    typeof record.date === "string" &&
    typeof record.conversions === "number" &&
    Number.isFinite(record.conversions) &&
    typeof record.revenue === "number" &&
    Number.isFinite(record.revenue) &&
    typeof record.source === "string"
  )
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  const projectId = req.nextUrl.searchParams.get("projectId")

  if (!projectId) {
    return NextResponse.json({ error: "projectId is required" }, { status: 400 })
  }

  const access = await requireProjectAccess(projectId)
  if ("status" in access) return access

  if (!Array.isArray(body)) {
    return NextResponse.json({ error: "Expected a JSON array" }, { status: 400 })
  }

  const invalidIndex = body.findIndex((row) => !isValidRow(row))
  if (invalidIndex !== -1) {
    return NextResponse.json({ error: `Invalid row at index ${invalidIndex}` }, { status: 400 })
  }

  const rows = (body as ConversionInput[]).map((row) => ({
    projectId,
    campaignId: row.campaignId,
    date: new Date(row.date),
    conversions: Math.max(0, Math.round(row.conversions)),
    revenue: row.revenue,
    source: row.source,
  }))

  if (rows.some((row) => Number.isNaN(row.date.getTime()))) {
    return NextResponse.json({ error: "All date values must be valid ISO-8601 strings" }, { status: 400 })
  }

  const result = await prisma.backendConversion.createMany({ data: rows })

  return NextResponse.json({ inserted: result.count })
}
