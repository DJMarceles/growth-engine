import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import prisma from "@/lib/prisma"
import { decrypt } from "@/lib/encryption"
import { listAdAccounts } from "@/lib/metaAds"

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: { accounts: { where: { provider: "facebook" } } },
  })
  const enc = user?.accounts[0]?.encrypted_meta_token
  if (!enc) return NextResponse.json({ accounts: [], stub: true })
  const token = decrypt(enc)
  const accounts = await listAdAccounts(token)
  return NextResponse.json({ accounts })
}
