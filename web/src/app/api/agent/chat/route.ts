import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import {
  mcpCreateTag,
  mcpDeleteTag,
  mcpUpdateTag,
  mcpCreateTrigger,
  mcpDeleteTrigger,
  mcpUpdateTrigger,
  mcpCreateVariable,
  mcpDeleteVariable,
  mcpUpdateVariable,
  mcpPublishVersion,
} from "@/lib/mcp-client"
import { importServerTemplate } from "@/lib/import-server-template"

const MINIMAX_API_KEY = process.env.MINIMAX_API_KEY

interface GTMCachedData {
  accountId: string
  accountName: string
  containers: {
    containerId: string
    containerName: string
    publicId: string
    usageContext: string[]
    workspaces: {
      workspaceId: string
      workspaceName: string
      tags: { tagId: string; name: string; type: string; paused: boolean; parameter: string | null }[]
      triggers: { triggerId: string; name: string; type: string }[]
      variables: { variableId: string; name: string; type: string; parameter: string | null }[]
    }[]
  }[]
}

async function getGTMData(userId: string): Promise<GTMCachedData[]> {
  const accounts = await prisma.gTMAccountCache.findMany({
    where: { userId },
    include: {
      containers: {
        include: {
          workspaces: {
            include: {
              tags: { select: { tagId: true, name: true, type: true, paused: true, parameter: true } },
              triggers: { select: { triggerId: true, name: true, type: true } },
              variables: { select: { variableId: true, name: true, type: true, parameter: true } },
            },
          },
        },
      },
    },
  })

  return accounts.map((a) => ({
    accountId: a.accountId,
    accountName: a.name,
    containers: a.containers.map((c) => ({
      containerId: c.containerId,
      containerName: c.name,
      publicId: c.publicId,
      usageContext: JSON.parse(c.usageContext || '[]'),
      workspaces: c.workspaces.map((w) => ({
        workspaceId: w.workspaceId,
        workspaceName: w.name,
        tags: w.tags,
        triggers: w.triggers,
        variables: w.variables,
      })),
    })),
  }))
}

function formatGTMContext(accounts: GTMCachedData[]): string {
  if (accounts.length === 0) {
    return '{"error": "No GTM data cached. User must sync GTM first."}'
  }

  // Compact JSON format — much more token-efficient than text
  const compact = accounts.map((a) => ({
    account: { id: a.accountId, name: a.accountName },
    containers: a.containers.map((c) => ({
      id: c.containerId,
      name: c.containerName,
      publicId: c.publicId,
      usageContext: c.usageContext,
      workspaces: c.workspaces.map((w) => ({
        id: w.workspaceId,
        name: w.workspaceName,
        tags: w.tags.map((t) => {
          const base: any = {
            id: t.tagId,
            name: t.name,
            type: t.type,
            ...(t.paused ? { paused: true } : {}),
          }
          // Expose key parameters for GA4 Config and Google Ads tags
          if (t.parameter) {
            try {
              const params = JSON.parse(t.parameter)
              if (Array.isArray(params)) {
                if (t.type === "gaawc") {
                  const mid = params.find((p: any) => p.key === "measurementId")?.value
                  if (mid) base.measurementId = mid
                }
                if (t.type === "awct") {
                  const cid = params.find((p: any) => p.key === "conversionId")?.value
                  const clabel = params.find((p: any) => p.key === "conversionLabel")?.value
                  if (cid) base.conversionId = cid
                  if (clabel) base.conversionLabel = clabel
                }
              }
            } catch {}
          }
          return base
        }),
        triggers: w.triggers.map((t) => ({ id: t.triggerId, name: t.name, type: t.type })),
        variables: w.variables.map((v) => {
          const vBase: any = { id: v.variableId, name: v.name, type: v.type }
          // Expose constant values and awct conversion params for the AI
          if (v.parameter) {
            try {
              const params = JSON.parse(v.parameter)
              if (Array.isArray(params)) {
                if (v.type === "c") {
                  const val = params.find((p: any) => p.key === "value")?.value
                  if (val) vBase.value = val
                }
              }
            } catch {}
          }
          return vBase
        }),
      })),
    })),
  }))

  return JSON.stringify(compact)
}

const SYSTEM_INSTRUCTION = `You are a helpful GTM expert. You operate on a SINGLE container selected by the user.

STYLE:
- Be conversational and natural, like a colleague helping with GTM.
- Answer in the same language as the user's message.
- Don't ask for confirmation for every action - just do it when the user asks.
- Only ask confirmation for DELETE operations or risky changes.
- Reference items by name when discussing, not by ID.

OPTIMIZATION RULES:
- Prefer UPDATE over DELETE+CREATE. To rename a tag, change its triggers, update parameters, or toggle pause: use update_tag with the existing tagId.
- Batch independent actions in a SINGLE JSON array (e.g., create 3 triggers at once: [{...},{...},{...}]).
- When creating a trigger AND a tag that uses it, output the trigger first in the array. The system will chain them and inject the real triggerId automatically.
- NEVER use placeholder IDs like "TRIGGER_ID_FROM_ABOVE". Instead, put "firingTriggerIds":["__REF:Trigger Name"] to reference a trigger created in the same batch by name. The system resolves these automatically.

ACTION JSON SCHEMA (respond with ONLY this JSON array when actions are needed):
[{
  "action": "create_tag" | "update_tag" | "delete_tag" | "create_trigger" | "update_trigger" | "delete_trigger" | "create_variable" | "update_variable" | "delete_variable" | "publish" | "install_server_template",
  "accountId": "string",
  "containerId": "string",
  "workspaceId": "string",
  "name": "string (for create/update)",
  "tagType": "string (for create_tag/update_tag)",
  "triggerType": "string (for create_trigger/update_trigger)",
  "variableType": "string (for create_variable/update_variable: v, j, k, c, u, jsm, aev, gas)",
  "tagId": "string (for update_tag/delete_tag)",
  "triggerId": "string (for update_trigger/delete_trigger)",
  "variableId": "string (for update_variable/delete_variable)",
  "itemId": "string (legacy alias for *Id in delete)",
  "parameters": [{"type": "template", "key": "...", "value": "..."}],
  "firingTriggerIds": ["triggerId1", ...],
  "blockingTriggerIds": ["triggerId1", ...],
  "customEventFilter": [{"type": "equals", "parameter": [...]}],
  "filter": [{"type": "equals", "parameter": [...]}],
  "paused": true|false,
  "consentStatus": "notSet|notNeeded|needed",
  "consentTypes": "ad_storage,analytics_storage",
  "notes": "string"
}]

UPDATE ACTIONS — these only change the fields you provide, everything else is preserved:
- update_tag: requires "tagId". Optional: name, tagType, parameters, firingTriggerIds, blockingTriggerIds, paused, consentStatus, consentTypes, notes.
- update_trigger: requires "triggerId", "name", "triggerType". Optional: parameters, filter, customEventFilter, autoEventFilter, notes.
- update_variable: requires "variableId", "name", "variableType". Optional: parameters, notes.

EXAMPLES:
- Pause a tag: [{"action":"update_tag","tagId":"42","paused":true}]
- Rename a trigger: [{"action":"update_trigger","triggerId":"15","name":"New Name","triggerType":"customEvent"}]
- Change measurement ID: [{"action":"update_tag","tagId":"5","parameters":[{"type":"template","key":"measurementId","value":"G-NEW123"}]}]
- Add consent to tag: [{"action":"update_tag","tagId":"5","consentStatus":"needed","consentTypes":"ad_storage,analytics_storage"}]

TAG TYPES & REQUIRED PARAMETERS:
- gaawc (GA4 Config): parameters [{"type":"template","key":"measurementId","value":"G-XXXXXXXX"}]. If unknown, ASK the user.
- gaawe (GA4 Event): parameters [{"type":"template","key":"measurementIdOverride","value":"G-XXXXXXXX"},{"type":"template","key":"eventName","value":"EVENT_NAME"}]. measurementIdOverride MUST NOT be empty — find the GA4 Measurement ID from the container's gaawc tag.
- awct (Google Ads Conversion): parameters [{"type":"template","key":"conversionId","value":"AW-XXXXXXXX"},{"type":"template","key":"conversionLabel","value":"LABEL"}]
- gclidw (Conversion Linker): no parameters needed. Fire on All Pages.
- html (Custom HTML): parameters [{"type":"template","key":"html","value":"<script>...</script>"}]
- img (Custom Image): parameters [{"type":"template","key":"url","value":"https://..."}]

TRIGGER TYPES & REQUIRED FIELDS:
- pageview: no extra fields needed. Add "filter" to restrict to specific pages:
  "filter":[{"type":"equals","parameter":[{"type":"template","key":"arg0","value":"{{Page Path}}"},{"type":"template","key":"arg1","value":"/checkout/thank-you"}]}]
- customEvent: MUST include "customEventFilter" (NOT "filter"):
  "customEventFilter":[{"type":"equals","parameter":[{"type":"template","key":"arg0","value":"{{_event}}"},{"type":"template","key":"arg1","value":"EVENT_NAME_HERE"}]}]
- linkClick: use "filter" (NOT autoEventFilter) to target elements:
  "filter":[{"type":"contains","parameter":[{"type":"template","key":"arg0","value":"{{Click URL}}"},{"type":"template","key":"arg1","value":"example.com"}]}]
- click (All Elements): same as linkClick, use "filter".
- formSubmission: use "filter" to target forms.
- scrollDepth: use "autoEventFilter" for scroll depth conditions.
- timer: use "eventName":{"type":"template","value":"gtm.timer"} (do NOT use "parameters" for timer triggers).
- jsError: no extra fields needed.
- triggerGroup: special type that fires when ALL child triggers have fired.

FILTER CONDITION TYPES: equals, contains, doesNotContain, startsWith, endsWith, matchRegex.
Each condition: {"type":"equals","parameter":[{"type":"template","key":"arg0","value":"{{Variable}}"},{"type":"template","key":"arg1","value":"match_value"}]}

VARIABLE TYPES & REQUIRED PARAMETERS:
- v (Data Layer): [{"type":"template","key":"name","value":"dataLayer.key.path"},{"type":"integer","key":"dataLayerVersion","value":"2"}]
- j (JavaScript Variable): [{"type":"template","key":"name","value":"globalJsVarName"}]
- k (1st Party Cookie): [{"type":"template","key":"name","value":"cookieName"}]
- c (Constant): [{"type":"template","key":"value","value":"constantValue"}]
- u (URL): [{"type":"template","key":"component","value":"URL"},{"type":"template","key":"customUrlSource","value":""}]
- jsm (Custom JS): [{"type":"template","key":"javascript","value":"function(){return ''}"}]
- aev (Auto-Event Variable): [{"type":"template","key":"varType","value":"ELEMENT"}]
- gas (GA Settings): [{"type":"template","key":"trackingId","value":"UA-XXXXX"}]

CHAINED ACTIONS (create trigger + tag in one batch):
Put both in the same array — trigger first, tag second. Use the trigger's name as reference:
[
  {"action":"create_trigger","name":"CE - purchase","triggerType":"customEvent","customEventFilter":[{"type":"equals","parameter":[{"type":"template","key":"arg0","value":"{{_event}}"},{"type":"template","key":"arg1","value":"purchase"}]}]},
  {"action":"create_tag","name":"GA4 - Purchase","tagType":"gaawe","parameters":[{"type":"template","key":"measurementIdOverride","value":"G-XXXXXXXX"},{"type":"template","key":"eventName","value":"purchase"}],"firingTriggerIds":["CE - purchase"]}
]
The system resolves "CE - purchase" to the real triggerId after the trigger is created. No need for two separate messages.

COMPLETE TAG PLAN EXAMPLE (when user asks for a full e-commerce setup):
Create ALL triggers first, then ALL tags, in ONE array. Use __REF:Name for cross-references:
[
  {"action":"create_trigger","name":"CE - purchase","triggerType":"customEvent","customEventFilter":[{"type":"equals","parameter":[{"type":"template","key":"arg0","value":"{{_event}}"},{"type":"template","key":"arg1","value":"purchase"}]}]},
  {"action":"create_trigger","name":"CE - add_to_cart","triggerType":"customEvent","customEventFilter":[{"type":"equals","parameter":[{"type":"template","key":"arg0","value":"{{_event}}"},{"type":"template","key":"arg1","value":"add_to_cart"}]}]},
  {"action":"create_trigger","name":"CE - begin_checkout","triggerType":"customEvent","customEventFilter":[{"type":"equals","parameter":[{"type":"template","key":"arg0","value":"{{_event}}"},{"type":"template","key":"arg1","value":"begin_checkout"}]}]},
  {"action":"create_trigger","name":"CE - view_item","triggerType":"customEvent","customEventFilter":[{"type":"equals","parameter":[{"type":"template","key":"arg0","value":"{{_event}}"},{"type":"template","key":"arg1","value":"view_item"}]}]},
  {"action":"create_tag","name":"GA4 - Purchase","tagType":"gaawe","parameters":[{"type":"template","key":"measurementIdOverride","value":"G-XXXXXXXX"},{"type":"template","key":"eventName","value":"purchase"}],"firingTriggerIds":["__REF:CE - purchase"]},
  {"action":"create_tag","name":"GA4 - Add to Cart","tagType":"gaawe","parameters":[{"type":"template","key":"measurementIdOverride","value":"G-XXXXXXXX"},{"type":"template","key":"eventName","value":"add_to_cart"}],"firingTriggerIds":["__REF:CE - add_to_cart"]},
  {"action":"create_tag","name":"GA4 - Begin Checkout","tagType":"gaawe","parameters":[{"type":"template","key":"measurementIdOverride","value":"G-XXXXXXXX"},{"type":"template","key":"eventName","value":"begin_checkout"}],"firingTriggerIds":["__REF:CE - begin_checkout"]},
  {"action":"create_tag","name":"GA4 - View Item","tagType":"gaawe","parameters":[{"type":"template","key":"measurementIdOverride","value":"G-XXXXXXXX"},{"type":"template","key":"eventName","value":"view_item"}],"firingTriggerIds":["__REF:CE - view_item"]}
]
IMPORTANT: Replace G-XXXXXXXX with the REAL Measurement ID found in the container's gaawc tag. If no gaawc tag exists, ASK the user for their GA4 Measurement ID before creating any tags.

SERVER TEMPLATE INSTALLATION:
Use "install_server_template" when the user asks to install/set up a server-side container or template.
Analyze the CURRENT client container to extract override values (GA4 Measurement ID from gaawc tags, publicId, Ads conversion IDs from awct tags). Ask for Meta Pixel ID if not found.
Target the SERVER container (usageContext=["SERVER"]). If there's only one server container or template, use it automatically.
Action: [{"action":"install_server_template","templateId":"ID","accountId":"...","containerId":"...","workspaceId":"...","overrides":{"Constant Name":"value"}}]

`

interface ChatMessage {
  role: "user" | "assistant"
  content: string
}

const MAX_HISTORY_MESSAGES = 20

async function callLLM(
  userMessage: string,
  gtmContext: string,
  defaultIds: { accountId: string; containerId: string; workspaceId: string; allContainers?: string; availableTemplates?: string },
  history: ChatMessage[] = []
): Promise<string> {
  if (!MINIMAX_API_KEY) {
    throw new Error("Minimax API key not configured")
  }

  // Build OpenAI-compatible messages array
  const gtmPreamble = `GTM CONTAINER DATA:\n${gtmContext}\n\nDEFAULT IDs (use these in action JSON):\n- accountId: "${defaultIds.accountId}"\n- containerId: "${defaultIds.containerId}"\n- workspaceId: "${defaultIds.workspaceId}"\n\nALL_CONTAINERS (all user containers for cross-container operations):\n${defaultIds.allContainers || "[]"}\n\nAVAILABLE_TEMPLATES (uploaded server templates the user can install):\n${defaultIds.availableTemplates || "[]"}`

  const messages: { role: string; content: string }[] = [
    { role: "system", content: SYSTEM_INSTRUCTION },
    { role: "user", content: gtmPreamble },
    { role: "assistant", content: "Understood. I have the GTM container data loaded. How can I help?" },
  ]

  // Append conversation history (limited to last N messages)
  const trimmedHistory = history.slice(-MAX_HISTORY_MESSAGES)
  for (const msg of trimmedHistory) {
    // Skip the last user message — we'll add it separately to ensure it's always last
    if (msg === trimmedHistory[trimmedHistory.length - 1] && msg.role === "user") continue
    messages.push({
      role: msg.role,
      content: msg.content,
    })
  }

  // Add current user message as the final turn
  messages.push({ role: "user", content: userMessage })

  const response = await fetch("https://api.minimax.io/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${MINIMAX_API_KEY}`,
    },
    body: JSON.stringify({
      model: "MiniMax-M2.5",
      messages,
      temperature: 0.3,
      max_tokens: 16384,
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Minimax API error: ${response.status} - ${error}`)
  }

  const data = await response.json()
  let text = data.choices?.[0]?.message?.content || "No response from AI"

  // Strip <think>...</think> reasoning tags that Minimax models include
  text = text.replace(/<think>[\s\S]*?<\/think>/g, "").trim()

  return text
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id || !session?.accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { message, action, context, history = [] } = await request.json()
    const userId = session.user.id
    const accessToken = session.accessToken

    // Get GTM data from cache
    const allGtmData = await getGTMData(userId)
    let gtmData = allGtmData

    // Filter by container if context provided
    if (context?.containerId) {
      gtmData = allGtmData
        .map((account) => ({
          ...account,
          containers: account.containers.filter((c) => c.containerId === context.containerId),
        }))
        .filter((account) => account.containers.length > 0)
    }

    const gtmContext = formatGTMContext(gtmData)

    // Build a lightweight summary of ALL containers (for server template targeting)
    const allContainers = allGtmData.flatMap((a) =>
      a.containers.map((c) => ({
        accountId: a.accountId,
        accountName: a.accountName,
        containerId: c.containerId,
        name: c.containerName,
        publicId: c.publicId,
        usageContext: c.usageContext,
        workspaceId: c.workspaces[0]?.workspaceId || "",
      }))
    )

    // Handle modification actions
    if (action) {
      const { action: actionType, type, accountId, containerId, workspaceId, itemId, name, tagType, triggerType, parameters, firingTriggerId, firingTriggerIds, blockingTriggerId, blockingTriggerIds, tagId, triggerId, variableId } = action
      const resolvedType = actionType || type

      // Normalize: AI may use either firingTriggerId or firingTriggerIds
      const resolvedFiringTriggerIds = firingTriggerIds || firingTriggerId
      const resolvedBlockingTriggerIds = blockingTriggerIds || blockingTriggerId

      // Use default IDs if AI returned undefined
      const defaultAccount = gtmData[0]
      const defaultContainer = defaultAccount?.containers?.[0]
      const defaultWorkspace = defaultContainer?.workspaces?.[0]

      const finalAccountId = accountId || defaultAccount?.accountId
      const finalContainerId = containerId || defaultContainer?.containerId
      const finalWorkspaceId = workspaceId || defaultWorkspace?.workspaceId

      if (!finalAccountId || !finalContainerId || !finalWorkspaceId) {
        return NextResponse.json({ error: "Missing GTM IDs. Please sync your GTM data first." }, { status: 400 })
      }

      try {
        let result: any = null

        switch (resolvedType) {
          case "create_tag":
            result = await mcpCreateTag(accessToken, finalAccountId, finalContainerId, finalWorkspaceId, {
              name,
              type: tagType,
              parameter: parameters,
              firingTriggerId: resolvedFiringTriggerIds,
              blockingTriggerId: resolvedBlockingTriggerIds,
            })
            return NextResponse.json({ response: `Tag "${name}" created successfully!`, result })

          case "update_tag": {
            const resolvedTagId = tagId || itemId
            if (!resolvedTagId) {
              return NextResponse.json({ error: "Missing tagId for update_tag" }, { status: 400 })
            }
            result = await mcpUpdateTag(accessToken, finalAccountId, finalContainerId, finalWorkspaceId, {
              tagId: resolvedTagId,
              name,
              type: tagType,
              parameter: parameters,
              firingTriggerIds: resolvedFiringTriggerIds,
              blockingTriggerIds: resolvedBlockingTriggerIds,
              paused: action.paused,
              consentStatus: action.consentStatus,
              consentTypes: action.consentTypes,
              notes: action.notes,
            })
            return NextResponse.json({ response: `Tag "${name || resolvedTagId}" updated successfully!`, result })
          }

          case "delete_tag":
            await mcpDeleteTag(accessToken, finalAccountId, finalContainerId, finalWorkspaceId, itemId || tagId)
            return NextResponse.json({ response: `Tag deleted successfully!` })

          case "create_trigger": {
            result = await mcpCreateTrigger(accessToken, finalAccountId, finalContainerId, finalWorkspaceId, {
              name,
              type: triggerType,
              filter: action.filter,
              autoEventFilter: action.autoEventFilter,
              customEventFilter: action.customEventFilter,
              eventName: action.eventName,
              notes: action.notes,
            })
            return NextResponse.json({ response: `Trigger "${name}" created successfully!`, result })
          }

          case "update_trigger": {
            const resolvedTriggerId = triggerId || itemId
            if (!resolvedTriggerId) {
              return NextResponse.json({ error: "Missing triggerId for update_trigger" }, { status: 400 })
            }
            result = await mcpUpdateTrigger(accessToken, finalAccountId, finalContainerId, finalWorkspaceId, {
              triggerId: resolvedTriggerId,
              name,
              type: triggerType,
              parameter: parameters,
              filter: action.filter,
              customEventFilter: action.customEventFilter,
              autoEventFilter: action.autoEventFilter,
              notes: action.notes,
            })
            return NextResponse.json({ response: `Trigger "${name || resolvedTriggerId}" updated successfully!`, result })
          }

          case "delete_trigger":
            await mcpDeleteTrigger(accessToken, finalAccountId, finalContainerId, finalWorkspaceId, itemId || triggerId)
            return NextResponse.json({ response: `Trigger deleted successfully!` })

          case "create_variable": {
            const varType = action.variableType || parameters?.variableType || "c"
            result = await mcpCreateVariable(accessToken, finalAccountId, finalContainerId, finalWorkspaceId, {
              name,
              type: varType,
              parameter: Array.isArray(parameters) ? parameters : parameters?.params || [],
            })
            return NextResponse.json({ response: `Variable "${name}" created successfully!`, result })
          }

          case "update_variable": {
            const resolvedVariableId = variableId || itemId
            if (!resolvedVariableId) {
              return NextResponse.json({ error: "Missing variableId for update_variable" }, { status: 400 })
            }
            const updateVarType = action.variableType || parameters?.variableType || "c"
            result = await mcpUpdateVariable(accessToken, finalAccountId, finalContainerId, finalWorkspaceId, {
              variableId: resolvedVariableId,
              name,
              type: updateVarType,
              parameter: Array.isArray(parameters) ? parameters : parameters?.params || [],
              notes: action.notes,
            })
            return NextResponse.json({ response: `Variable "${name || resolvedVariableId}" updated successfully!`, result })
          }

          case "delete_variable":
            await mcpDeleteVariable(accessToken, finalAccountId, finalContainerId, finalWorkspaceId, itemId || variableId)
            return NextResponse.json({ response: `Variable deleted successfully!` })

          case "publish":
            result = await mcpPublishVersion(accessToken, finalAccountId, finalContainerId, finalWorkspaceId)
            return NextResponse.json({ response: `Changes published successfully!`, result })

          case "install_server_template": {
            const overrides: Record<string, string> = action.overrides || {}
            const templateId: string = action.templateId
            if (!templateId) {
              return NextResponse.json({ error: "Missing templateId for install_server_template" }, { status: 400 })
            }
            const tmpl = await prisma.serverTemplate.findFirst({
              where: { id: templateId, userId },
              select: { content: true },
            })
            if (!tmpl) {
              return NextResponse.json({ error: "Template not found" }, { status: 404 })
            }
            result = await importServerTemplate(accessToken, finalAccountId, finalContainerId, finalWorkspaceId, tmpl.content, overrides)
            return NextResponse.json({ response: result.summary, result })
          }

          default:
            return NextResponse.json({ error: "Unknown action" }, { status: 400 })
        }
      } catch (apiError: any) {
        return NextResponse.json({ error: `Action failed: ${apiError.message}` }, { status: 500 })
      }
    }

    // Resolve default IDs for the selected container
    const firstAccount = gtmData[0]
    const firstContainer = firstAccount?.containers?.[0]
    const firstWorkspace = firstContainer?.workspaces?.[0]

    // Fetch available server templates for the user
    const userTemplates = await prisma.serverTemplate.findMany({
      where: { userId },
      select: { id: true, name: true, description: true, constants: true, tagCount: true, triggerCount: true, variableCount: true, clientCount: true },
    })
    const templatesForAI = userTemplates.map((t) => ({
      id: t.id,
      name: t.name,
      description: t.description,
      stats: { tags: t.tagCount, triggers: t.triggerCount, variables: t.variableCount, clients: t.clientCount },
      constants: JSON.parse(t.constants || "[]"),
    }))

    const defaultIds = {
      accountId: firstAccount?.accountId || "",
      containerId: firstContainer?.containerId || "",
      workspaceId: firstWorkspace?.workspaceId || "",
      allContainers: JSON.stringify(allContainers),
      availableTemplates: JSON.stringify(templatesForAI),
    }

    const aiResponse = await callLLM(message, gtmContext, defaultIds, history)

    return NextResponse.json({ response: aiResponse })
  } catch (error: any) {
    console.error("Agent error:", error)
    return NextResponse.json(
      { error: error.message || "Agent failed" },
      { status: 500 }
    )
  }
}
