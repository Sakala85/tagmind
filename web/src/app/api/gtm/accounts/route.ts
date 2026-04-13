import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { mcpListAccounts, mcpListContainers } from "@/lib/mcp-client"

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id || !session?.accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const userId = session.user.id

    // Check if cache exists
    const cachedAccounts = await prisma.gTMAccountCache.findMany({
      where: { userId },
      include: {
        containers: {
          include: {
            workspaces: true,
          },
        },
      },
    })

    // If cache exists and has data, return it
    if (cachedAccounts.length > 0) {
      const accountsWithContainers = cachedAccounts.map((account) => ({
        accountId: account.accountId,
        name: account.name,
        path: account.path,
        containers: account.containers.map((container) => ({
          containerId: container.containerId,
          name: container.name,
          publicId: container.publicId,
          usageContext: JSON.parse(container.usageContext || "[]"),
          domainName: container.domainName ? container.domainName.split(",") : [],
          path: container.path,
          accountId: container.accountId,
        })),
      }))

      return NextResponse.json(accountsWithContainers)
    }

    // No cache, fetch from API
    const accounts = await mcpListAccounts(session.accessToken) as any[]

    const accountsWithContainers = await Promise.all(
      accounts.map(async (account) => {
        try {
          const containers = await mcpListContainers(session.accessToken!, account.accountId) as any[]
          return { ...account, containers }
        } catch {
          return { ...account, containers: [] }
        }
      })
    )

    return NextResponse.json(accountsWithContainers)
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch accounts" },
      { status: 500 }
    )
  }
}
