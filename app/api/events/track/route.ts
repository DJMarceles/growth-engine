import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"

const ALLOWED_EVENTS = ["page_view", "waitlist_submit", "checkout_click", "purchase"]

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { projectId, eventType, metadata } = body
  if (!ALLOWED_EVENTS.includes(eventType)) return NextResponse.json({ error: "Invalid event type" }, { status: 400 })
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  await prisma.evidenceSnapshot.create({
    data: { projectId, source: "landing_analytics", snapshot_json: { eventType, metadata, timestamp: new Date().toISOString() } },
  })
  await prisma.landingMetricDaily.upsert({
    where: { projectId_date_eventType: { projectId, date: today, eventType } },
    update: { count: { increment: 1 } },
    create: { projectId, date: today, eventType, count: 1, metadata_json: metadata ?? null },
  })
  return NextResponse.json({ ok: true })
}
