import { NextAuthOptions } from "next-auth"
import GoogleProvider from "next-auth/providers/google"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { prisma } from "@/lib/prisma"

async function refreshAccessToken(token: any) {
  try {
    const url = "https://oauth2.googleapis.com/token"
    const params = new URLSearchParams({
      client_id: process.env.GTM_GOOGLE_CLIENT_ID ?? "",
      client_secret: process.env.GTM_GOOGLE_CLIENT_SECRET ?? "",
      grant_type: "refresh_token",
      refresh_token: token.refreshToken,
    })

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params,
    })

    const tokens = await response.json()

    if (!response.ok) {
      throw tokens
    }

    return {
      ...token,
      accessToken: tokens.access_token,
      expiresAt: Math.floor(Date.now() / 1000 + tokens.expires_in),
    }
  } catch (error) {
    console.error("Token refresh failed:", error)
    return { ...token, error: "RefreshAccessTokenError" }
  }
}

/*
 * Required environment variables:
 *   GOOGLE_CLIENT_ID       - Google OAuth 2.0 client ID
 *   GOOGLE_CLIENT_SECRET   - Google OAuth 2.0 client secret
 *   NEXTAUTH_SECRET        - Random secret for NextAuth session encryption
 *   NEXTAUTH_URL           - Base URL of the app (e.g. http://localhost:3000)
 */

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma as any),
  providers: [
    GoogleProvider({
      clientId: process.env.GTM_GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GTM_GOOGLE_CLIENT_SECRET ?? "",
      allowDangerousEmailAccountLinking: true,
      authorization: {
        params: {
          scope: [
            "openid",
            "email",
            "profile",
            "https://www.googleapis.com/auth/tagmanager.edit.containers",
            "https://www.googleapis.com/auth/tagmanager.edit.containerversions",
            "https://www.googleapis.com/auth/tagmanager.publish",
            "https://www.googleapis.com/auth/tagmanager.delete.containers",
          ].join(" "),
          access_type: "offline",
          prompt: "consent",
        },
      },
    }),
  ],
  callbacks: {
    async jwt({ token, account }) {
      if (account) {
        token.accessToken = account.access_token
        token.refreshToken = account.refresh_token
        token.expiresAt = account.expires_at
      }

      // Refresh token if expired
      if (token.expiresAt && Date.now() / 1000 > token.expiresAt - 60) {
        return refreshAccessToken(token)
      }

      return token
    },
    async session({ session, token }) {
      session.accessToken = token.accessToken as string
      if (token.sub) {
        session.user.id = token.sub
      }
      return session
    },
  },
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
  debug: true,
}

