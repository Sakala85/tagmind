import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import {
  mcpListAccounts,
  mcpListContainers,
  mcpListWorkspaces,
  mcpListTags,
  mcpListTriggers,
  mcpListVariables,
} from "@/lib/mcp-client"

export async function POST() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id || !session.accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const userId = session.user.id
    const accessToken = session.accessToken

    // Fetch all data from GTM API
    const accounts = await mcpListAccounts(accessToken)

    // Clear old cache for this user
    await prisma.gTMAccountCache.deleteMany({ where: { userId } })

    // Store accounts and containers
    for (const account of accounts) {
      const accountData = await prisma.gTMAccountCache.create({
        data: {
          userId,
          accountId: account.accountId,
          name: account.name,
          path: account.path,
        },
      })

      // Fetch and cache containers
      const containers = await mcpListContainers(accessToken, account.accountId)
      for (const container of containers) {
        const usageCtx = container.usageContext || []
        const domainNames = container.domainName
        await prisma.gTMContainerCache.create({
          data: {
            userId,
            accountId: account.accountId,
            containerId: container.containerId,
            name: container.name,
            publicId: container.publicId,
            usageContext: JSON.stringify(usageCtx),
            domainName: domainNames ? domainNames.join(",") : null,
            path: container.path,
          },
        })

        // Fetch and cache workspaces
        const workspaces = await mcpListWorkspaces(accessToken, account.accountId, container.containerId)
        for (const workspace of workspaces) {
          await prisma.gTMWorkspaceCache.create({
            data: {
              userId,
              accountId: account.accountId,
              containerId: container.containerId,
              workspaceId: workspace.workspaceId,
              name: workspace.name,
              description: workspace.description,
              path: workspace.path,
            },
          })

          // Fetch and cache tags, triggers, variables in parallel
          const [tags, triggers, variables] = await Promise.all([
            mcpListTags(accessToken, account.accountId, container.containerId, workspace.workspaceId),
            mcpListTriggers(accessToken, account.accountId, container.containerId, workspace.workspaceId),
            mcpListVariables(accessToken, account.accountId, container.containerId, workspace.workspaceId),
          ])

          for (const tag of tags) {
            await prisma.gTMTagCache.create({
              data: {
                userId,
                accountId: account.accountId,
                containerId: container.containerId,
                workspaceId: workspace.workspaceId,
                tagId: tag.tagId,
                name: tag.name,
                type: tag.type,
                parameter: tag.parameter ? JSON.stringify(tag.parameter) : null,
                firingTriggerId: tag.firingTriggerId ? JSON.stringify(tag.firingTriggerId) : null,
                blockingTriggerId: tag.blockingTriggerId ? JSON.stringify(tag.blockingTriggerId) : null,
                paused: tag.paused || false,
                path: tag.path,
              },
            })
          }

          for (const trigger of triggers) {
            await prisma.gTMTriggerCache.create({
              data: {
                userId,
                accountId: account.accountId,
                containerId: container.containerId,
                workspaceId: workspace.workspaceId,
                triggerId: trigger.triggerId,
                name: trigger.name,
                type: trigger.type,
                parameter: trigger.parameter ? JSON.stringify(trigger.parameter) : null,
                filter: trigger.filter ? JSON.stringify(trigger.filter) : null,
                path: trigger.path,
              },
            })
          }

          for (const variable of variables) {
            await prisma.gTMVariableCache.create({
              data: {
                userId,
                accountId: account.accountId,
                containerId: container.containerId,
                workspaceId: workspace.workspaceId,
                variableId: variable.variableId,
                name: variable.name,
                type: variable.type,
                parameter: variable.parameter ? JSON.stringify(variable.parameter) : null,
                path: variable.path,
              },
            })
          }
        }
      }
    }

    return NextResponse.json({ success: true, syncedAt: new Date().toISOString() })
  } catch (error: any) {
    console.error("Sync error:", error)
    return NextResponse.json(
      { error: error.message || "Sync failed" },
      { status: 500 }
    )
  }
}

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const userId = session.user.id

    // Get latest sync time
    const latestSync = await prisma.gTMAccountCache.findFirst({
      where: { userId },
      orderBy: { syncedAt: "desc" },
      select: { syncedAt: true },
    })

    // Get cache stats
    const [accountCount, containerCount, workspaceCount, tagCount, triggerCount, variableCount] = await Promise.all([
      prisma.gTMAccountCache.count({ where: { userId } }),
      prisma.gTMContainerCache.count({ where: { userId } }),
      prisma.gTMWorkspaceCache.count({ where: { userId } }),
      prisma.gTMTagCache.count({ where: { userId } }),
      prisma.gTMTriggerCache.count({ where: { userId } }),
      prisma.gTMVariableCache.count({ where: { userId } }),
    ])

    return NextResponse.json({
      syncedAt: latestSync?.syncedAt || null,
      stats: {
        accounts: accountCount,
        containers: containerCount,
        workspaces: workspaceCount,
        tags: tagCount,
        triggers: triggerCount,
        variables: variableCount,
      },
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to get sync status" },
      { status: 500 }
    )
  }
}
