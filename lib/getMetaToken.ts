import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import prisma from "@/lib/prisma"
import { decrypt } from "@/lib/encryption"
import { NextResponse } from "next/server"

export async function getMetaToken(): Promise<{ token: string } | NextResponse> {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: { accounts: { where: { provider: "facebook" } } },
  })

  const enc = user?.accounts[0]?.encrypted_meta_token
  if (!enc) {
    return NextResponse.json(
      { error: "No Meta token. Connect your Meta account first.", reconnect: true },
      { status: 403 }
    )
  }

  try {
    return { token: decrypt(enc) }
  } catch {
    return NextResponse.json(
      { error: "Meta token decryption failed. Reconnect your account.", reconnect: true },
      { status: 403 }
    )
  }
}
