import { NextRequest, NextResponse } from "next/server"

export function requireCronSecret(req: NextRequest): NextResponse | null {
  const expectedSecret = process.env.CRON_SECRET
  if (!expectedSecret) {
    return NextResponse.json({ error: "CRON_SECRET is not configured" }, { status: 500 })
  }

  const providedSecret = req.headers.get("CRON_SECRET") ?? req.headers.get("x-cron-secret")
  if (providedSecret !== expectedSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  return null
}
