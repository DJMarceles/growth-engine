import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import prisma from "@/lib/prisma"
import { decrypt } from "@/lib/encryption"
import { listPixels } from "@/lib/metaAds"

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { searchParams } = new URL(req.url)
  const adAccountId = searchParams.get("adAccountId")
  if (!adAccountId) return NextResponse.json({ error: "adAccountId required" }, { status: 400 })
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { accounts: { where: { provider: "facebook" } } },
  })
  const enc = user?.accounts[0]?.encrypted_meta_token
  if (!enc) return NextResponse.json({ pixels: [], stub: true })
  const pixels = await listPixels(decrypt(enc), adAccountId)
  return NextResponse.json({ pixels })
}
