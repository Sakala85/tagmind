import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { mcpListWorkspaces, mcpListTags, mcpListTriggers, mcpListVariables } from "@/lib/mcp-client"

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const accountId = searchParams.get("accountId")
  const containerId = searchParams.get("containerId")

  if (!accountId || !containerId) {
    return NextResponse.json(
      { error: "accountId and containerId are required" },
      { status: 400 }
    )
  }

  try {
    const workspaces = await mcpListWorkspaces(session.accessToken, accountId, containerId)

    if (!Array.isArray(workspaces) || workspaces.length === 0) {
      return NextResponse.json({ workspaces: [], tags: [], triggers: [], variables: [] })
    }

    const defaultWorkspace = workspaces[0]

    const [tags, triggers, variables] = await Promise.all([
      mcpListTags(session.accessToken, accountId, containerId, defaultWorkspace.workspaceId),
      mcpListTriggers(session.accessToken, accountId, containerId, defaultWorkspace.workspaceId),
      mcpListVariables(session.accessToken, accountId, containerId, defaultWorkspace.workspaceId),
    ])

    return NextResponse.json({
      workspaces,
      tags,
      triggers,
      variables,
      activeWorkspace: defaultWorkspace,
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch workspace data" },
      { status: 500 }
    )
  }
}
