const MCP_SERVER_URL = process.env.NEXT_PUBLIC_MCP_SERVER_URL || "http://localhost:8080"

// Per-token session state to avoid leaking sessions between users
const mcpSessions = new Map<string, { initialized: boolean; sessionId: string | null; requestId: number }>()

function getSession(token: string) {
  if (!mcpSessions.has(token)) {
    mcpSessions.set(token, { initialized: false, sessionId: null, requestId: 1 })
  }
  return mcpSessions.get(token)!
}

interface MCPRequest {
  jsonrpc: "2.0"
  id: number
  method: string
  params?: {
    name?: string
    arguments?: Record<string, unknown>
    protocolVersion?: string
    capabilities?: Record<string, unknown>
    clientInfo?: { name: string; version: string }
  }
}

interface MCPResponse {
  jsonrpc: "2.0"
  id: number
  result?: {
    protocolVersion?: string
    capabilities?: Record<string, unknown>
    serverInfo?: { name: string; version: string }
    content?: Array<{ type: string; text?: string }>
  }
  error?: {
    code: number
    message: string
    data?: string
  }
}

function parseSSEResponse(text: string): MCPResponse | null {
  const lines = text.split("\n")
  let data = ""
  for (const line of lines) {
    if (line.startsWith("data: ")) {
      data = line.slice(6)
      break
    }
  }
  if (!data) return null
  try {
    return JSON.parse(data)
  } catch {
    return null
  }
}

async function mcpInitialize(accessToken: string): Promise<void> {
  const session = getSession(accessToken)
  const initRequest: MCPRequest = {
    jsonrpc: "2.0",
    id: session.requestId++,
    method: "initialize",
    params: {
      protocolVersion: "2024-11-05",
      capabilities: {},
      clientInfo: { name: "gtm-web-client", version: "1.0.0" },
    },
  }

  const response = await fetch(MCP_SERVER_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(initRequest),
  })

  if (!response.ok) {
    throw new Error(`MCP init failed: ${response.status}`)
  }

  const contentType = response.headers.get("content-type") || ""
  let data: MCPResponse

  if (contentType.includes("text/event-stream")) {
    const text = await response.text()
    data = parseSSEResponse(text)!
  } else {
    data = await response.json()
  }

  if (data.error) {
    throw new Error(`MCP init error: ${data.error.message}`)
  }

  session.sessionId = response.headers.get("mcp-session-id")
  session.initialized = true
}

async function mcpRequest(accessToken: string, method: string, args?: Record<string, unknown>): Promise<unknown> {
  const session = getSession(accessToken)
  if (!session.initialized) {
    await mcpInitialize(accessToken)
  }

  const request: MCPRequest = {
    jsonrpc: "2.0",
    id: session.requestId++,
    method: "tools/call",
    params: {
      name: method,
      arguments: args || {},
    },
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${accessToken}`,
  }
  if (session.sessionId) {
    headers["mcp-session-id"] = session.sessionId
  }

  const response = await fetch(MCP_SERVER_URL, {
    method: "POST",
    headers,
    body: JSON.stringify(request),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`MCP request failed: ${response.status} - ${errorText}`)
  }

  const contentType = response.headers.get("content-type") || ""

  let data: MCPResponse

  if (contentType.includes("text/event-stream")) {
    const text = await response.text()
    const parsed = parseSSEResponse(text)
    if (!parsed) {
      throw new Error(`Invalid SSE response: ${text}`)
    }
    data = parsed
  } else {
    data = await response.json()
  }

  if (data.error) {
    throw new Error(`MCP error: ${data.error.message} ${data.error.data || ""}`)
  }

  const content = data.result?.content?.[0]
  if (content?.type === "text") {
    try {
      return JSON.parse(content.text || "{}")
    } catch {
      return content.text
    }
  }

  return data.result
}

function parseJsonResponse(text: string): unknown {
  try {
    return JSON.parse(text)
  } catch {
    return text
  }
}

export async function mcpListAccounts(accessToken: string): Promise<any[]> {
  const res: any = await mcpRequest(accessToken, "list_accounts", {})
  return res?.accounts || res || []
}

export async function mcpListContainers(accessToken: string, accountId: string): Promise<any[]> {
  const res: any = await mcpRequest(accessToken, "list_containers", { accountId })
  return res?.containers || res || []
}

export async function mcpListWorkspaces(
  accessToken: string,
  accountId: string,
  containerId: string
): Promise<any[]> {
  const res: any = await mcpRequest(accessToken, "list_workspaces", { accountId, containerId })
  return res?.workspaces || res || []
}

export async function mcpListTags(
  accessToken: string,
  accountId: string,
  containerId: string,
  workspaceId: string
): Promise<any[]> {
  const res: any = await mcpRequest(accessToken, "list_tags", { accountId, containerId, workspaceId })
  return res?.tags || res || []
}

export async function mcpListTriggers(
  accessToken: string,
  accountId: string,
  containerId: string,
  workspaceId: string
): Promise<any[]> {
  const res: any = await mcpRequest(accessToken, "list_triggers", { accountId, containerId, workspaceId })
  return res?.triggers || res || []
}

export async function mcpListVariables(
  accessToken: string,
  accountId: string,
  containerId: string,
  workspaceId: string
): Promise<any[]> {
  const res: any = await mcpRequest(accessToken, "list_variables", { accountId, containerId, workspaceId })
  return res?.variables || res || []
}

export interface MCPCreateTagInput {
  name: string
  type: string
  firingTriggerId?: string[]
  blockingTriggerId?: string[]
  parameter?: Array<{ type: string; key: string; value: string }>
}

export async function mcpCreateTag(
  accessToken: string,
  accountId: string,
  containerId: string,
  workspaceId: string,
  input: MCPCreateTagInput
): Promise<unknown> {
  return mcpRequest(accessToken, "create_tag", {
    accountId,
    containerId,
    workspaceId,
    name: input.name,
    type: input.type,
    firingTriggerIds: input.firingTriggerId,
    blockingTriggerIds: input.blockingTriggerId,
    parametersJson: input.parameter ? JSON.stringify(input.parameter) : undefined,
  })
}

export async function mcpDeleteTag(
  accessToken: string,
  accountId: string,
  containerId: string,
  workspaceId: string,
  tagId: string
): Promise<unknown> {
  return mcpRequest(accessToken, "delete_tag", {
    accountId,
    containerId,
    workspaceId,
    tagId,
    confirm: true,
  })
}

export interface MCPCreateTriggerInput {
  name: string
  type: string
  filter?: unknown[]
  autoEventFilter?: unknown[]
  customEventFilter?: unknown[]
  eventName?: { type: string; value: string }
  notes?: string
}

export async function mcpCreateTrigger(
  accessToken: string,
  accountId: string,
  containerId: string,
  workspaceId: string,
  input: MCPCreateTriggerInput
): Promise<unknown> {
  return mcpRequest(accessToken, "create_trigger", {
    accountId,
    containerId,
    workspaceId,
    name: input.name,
    type: input.type,
    filterJson: input.filter ? JSON.stringify(input.filter) : undefined,
    autoEventFilterJson: input.autoEventFilter ? JSON.stringify(input.autoEventFilter) : undefined,
    customEventFilterJson: input.customEventFilter ? JSON.stringify(input.customEventFilter) : undefined,
    eventNameJson: input.eventName ? JSON.stringify(input.eventName) : undefined,
    notes: input.notes,
  })
}

export async function mcpDeleteTrigger(
  accessToken: string,
  accountId: string,
  containerId: string,
  workspaceId: string,
  triggerId: string
): Promise<unknown> {
  return mcpRequest(accessToken, "delete_trigger", {
    accountId,
    containerId,
    workspaceId,
    triggerId,
    confirm: true,
  })
}

export interface MCPCreateVariableInput {
  name: string
  type: string
  parameter?: Array<{ type: string; key: string; value: string }>
}

export async function mcpCreateVariable(
  accessToken: string,
  accountId: string,
  containerId: string,
  workspaceId: string,
  input: MCPCreateVariableInput
): Promise<unknown> {
  return mcpRequest(accessToken, "create_variable", {
    accountId,
    containerId,
    workspaceId,
    name: input.name,
    type: input.type,
    parametersJson: input.parameter ? JSON.stringify(input.parameter) : undefined,
  })
}

export async function mcpDeleteVariable(
  accessToken: string,
  accountId: string,
  containerId: string,
  workspaceId: string,
  variableId: string
): Promise<unknown> {
  return mcpRequest(accessToken, "delete_variable", {
    accountId,
    containerId,
    workspaceId,
    variableId,
    confirm: true,
  })
}

export async function mcpPublishVersion(
  accessToken: string,
  accountId: string,
  containerId: string,
  workspaceId: string
): Promise<unknown> {
  return mcpRequest(accessToken, "publish_version", {
    accountId,
    containerId,
    workspaceId,
  })
}

// ── Update operations ──

export interface MCPUpdateTagInput {
  tagId: string
  name?: string
  type?: string
  firingTriggerIds?: string[]
  blockingTriggerIds?: string[]
  parameter?: Array<{ type: string; key: string; value: string }>
  paused?: boolean
  consentStatus?: string
  consentTypes?: string
  notes?: string
}

export async function mcpUpdateTag(
  accessToken: string,
  accountId: string,
  containerId: string,
  workspaceId: string,
  input: MCPUpdateTagInput
): Promise<unknown> {
  return mcpRequest(accessToken, "update_tag", {
    accountId,
    containerId,
    workspaceId,
    tagId: input.tagId,
    name: input.name,
    type: input.type,
    firingTriggerIds: input.firingTriggerIds,
    blockingTriggerIds: input.blockingTriggerIds,
    parametersJson: input.parameter ? JSON.stringify(input.parameter) : undefined,
    paused: input.paused,
    consentStatus: input.consentStatus,
    consentTypes: input.consentTypes,
    notes: input.notes,
  })
}

export interface MCPUpdateTriggerInput {
  triggerId: string
  name: string
  type: string
  parameter?: Array<{ type: string; key: string; value: string }>
  filter?: unknown[]
  customEventFilter?: unknown[]
  autoEventFilter?: unknown[]
  notes?: string
}

export async function mcpUpdateTrigger(
  accessToken: string,
  accountId: string,
  containerId: string,
  workspaceId: string,
  input: MCPUpdateTriggerInput
): Promise<unknown> {
  return mcpRequest(accessToken, "update_trigger", {
    accountId,
    containerId,
    workspaceId,
    triggerId: input.triggerId,
    name: input.name,
    type: input.type,
    parameterJson: input.parameter ? JSON.stringify(input.parameter) : undefined,
    filterJson: input.filter ? JSON.stringify(input.filter) : undefined,
    customEventFilterJson: input.customEventFilter ? JSON.stringify(input.customEventFilter) : undefined,
    autoEventFilterJson: input.autoEventFilter ? JSON.stringify(input.autoEventFilter) : undefined,
    notes: input.notes,
  })
}

export interface MCPUpdateVariableInput {
  variableId: string
  name: string
  type: string
  parameter?: Array<{ type: string; key: string; value: string }>
  notes?: string
}

export async function mcpUpdateVariable(
  accessToken: string,
  accountId: string,
  containerId: string,
  workspaceId: string,
  input: MCPUpdateVariableInput
): Promise<unknown> {
  return mcpRequest(accessToken, "update_variable", {
    accountId,
    containerId,
    workspaceId,
    variableId: input.variableId,
    name: input.name,
    type: input.type,
    parametersJson: input.parameter ? JSON.stringify(input.parameter) : undefined,
    notes: input.notes,
  })
}

export async function mcpPing(accessToken: string): Promise<unknown> {
  return mcpRequest(accessToken, "ping", {})
}
