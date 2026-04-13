import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { runAudit } from "@/lib/gtm-api"
import { mcpListTags, mcpListTriggers, mcpListVariables, mcpListWorkspaces } from "@/lib/mcp-client"

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { accountId, containerId, containerName } = await req.json()

    if (!accountId || !containerId) {
      return NextResponse.json(
        { error: "accountId and containerId are required" },
        { status: 400 }
      )
    }

    const workspaces = await mcpListWorkspaces(session.accessToken, accountId, containerId)
    if (!Array.isArray(workspaces) || workspaces.length === 0) {
      return NextResponse.json({ error: "No workspaces found" }, { status: 404 })
    }

    const ws = workspaces[0]
    const [tags, triggers, variables] = await Promise.all([
      mcpListTags(session.accessToken, accountId, containerId, ws.workspaceId),
      mcpListTriggers(session.accessToken, accountId, containerId, ws.workspaceId),
      mcpListVariables(session.accessToken, accountId, containerId, ws.workspaceId),
    ])

    const report = runAudit(tags, triggers, variables, containerName || containerId, containerId)

    return NextResponse.json(report)
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Audit failed" },
      { status: 500 }
    )
  }
}
