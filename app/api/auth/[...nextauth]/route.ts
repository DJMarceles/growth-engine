import NextAuth, { type NextAuthOptions } from "next-auth"
import FacebookProvider from "next-auth/providers/facebook"
import { PrismaAdapter } from "@auth/prisma-adapter"
import type { Adapter, AdapterUser } from "next-auth/adapters"
import prisma from "@/lib/prisma"
import { encrypt } from "@/lib/encryption"

export const authOptions: NextAuthOptions = {
  adapter: {
    ...PrismaAdapter(prisma),
    createUser: (data: Omit<AdapterUser, "id">) => {
      return prisma.user.create({ data: { ...data, email: data.email ?? null } })
    },
  } as Adapter,
  providers: [
    FacebookProvider({
      clientId: process.env.META_APP_ID!,
      clientSecret: process.env.META_APP_SECRET!,
      authorization: {
        params: {
          scope: [
            "ads_read",
            "ads_management",
            "business_management",
            "public_profile",
          ].join(","),
        },
      },
    }),
  ],
  callbacks: {
    async signIn({ account }) {
      if (account?.provider === "facebook" && account.access_token) {
        try {
          await prisma.account.update({
            where: {
              provider_providerAccountId: {
                provider: "facebook",
                providerAccountId: account.providerAccountId,
              },
            },
            data: { encrypted_meta_token: encrypt(account.access_token) },
          })
        } catch {
          // Deferred to linkAccount event on first sign-in
        }
      }
      return true
    },
    async session({ session, user }) {
      if (session.user) session.user.id = user.id
      return session
    },
  },
  events: {
    async linkAccount({ account }) {
      if (account.provider === "facebook" && account.access_token) {
        await prisma.account.update({
          where: {
            provider_providerAccountId: {
              provider: "facebook",
              providerAccountId: account.providerAccountId,
            },
          },
          data: { encrypted_meta_token: encrypt(account.access_token) },
        })
      }
    },
  },
  pages: {
    signIn: "/auth/signin",
    error: "/auth/error",
  },
  session: { strategy: "database" },
  debug: process.env.NODE_ENV === "development",
}

const handler = NextAuth(authOptions)
export { handler as GET, handler as POST }
