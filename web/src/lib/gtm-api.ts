import {
  GTMAccount,
  GTMContainer,
  GTMWorkspace,
  GTMTag,
  GTMTrigger,
  GTMVariable,
  AuditReport,
  AuditIssue,
  AuditSummary,
  AuditCategory,
} from "@/types/gtm"

const GTM_API_BASE = "https://tagmanager.googleapis.com/tagmanager/v2"

async function gtmFetch<T>(path: string, accessToken: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${GTM_API_BASE}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      ...options?.headers,
    },
  })

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: { message: res.statusText } }))
    throw new Error(error.error?.message || `GTM API error: ${res.status}`)
  }

  return res.json()
}

export async function listAccounts(accessToken: string): Promise<GTMAccount[]> {
  const data = await gtmFetch<{ account: any[] }>("/accounts", accessToken)
  return (data.account || []).map((a: any) => ({
    accountId: a.accountId,
    name: a.name,
    path: a.path,
  }))
}

export async function listContainers(accessToken: string, accountId: string): Promise<GTMContainer[]> {
  const data = await gtmFetch<{ container: any[] }>(
    `/accounts/${accountId}/containers`,
    accessToken
  )
  return (data.container || []).map((c: any) => ({
    containerId: c.containerId,
    name: c.name,
    publicId: c.publicId,
    usageContext: c.usageContext || [],
    domainName: c.domainName,
    path: c.path,
    accountId: accountId,
  }))
}

export async function listWorkspaces(
  accessToken: string,
  accountId: string,
  containerId: string
): Promise<GTMWorkspace[]> {
  const data = await gtmFetch<{ workspace: any[] }>(
    `/accounts/${accountId}/containers/${containerId}/workspaces`,
    accessToken
  )
  return (data.workspace || []).map((w: any) => ({
    workspaceId: w.workspaceId,
    name: w.name,
    description: w.description,
    path: w.path,
    accountId,
    containerId,
  }))
}

export async function listTags(
  accessToken: string,
  accountId: string,
  containerId: string,
  workspaceId: string
): Promise<GTMTag[]> {
  const data = await gtmFetch<{ tag: any[] }>(
    `/accounts/${accountId}/containers/${containerId}/workspaces/${workspaceId}/tags`,
    accessToken
  )
  return (data.tag || []).map((t: any) => ({
    tagId: t.tagId,
    name: t.name,
    type: t.type,
    parameter: t.parameter,
    firingTriggerId: t.firingTriggerId,
    blockingTriggerId: t.blockingTriggerId,
    paused: t.paused,
    path: t.path,
  }))
}

export async function listTriggers(
  accessToken: string,
  accountId: string,
  containerId: string,
  workspaceId: string
): Promise<GTMTrigger[]> {
  const data = await gtmFetch<{ trigger: any[] }>(
    `/accounts/${accountId}/containers/${containerId}/workspaces/${workspaceId}/triggers`,
    accessToken
  )
  return (data.trigger || []).map((t: any) => ({
    triggerId: t.triggerId,
    name: t.name,
    type: t.type,
    parameter: t.parameter,
    filter: t.filter,
    path: t.path,
  }))
}

export async function listVariables(
  accessToken: string,
  accountId: string,
  containerId: string,
  workspaceId: string
): Promise<GTMVariable[]> {
  const data = await gtmFetch<{ variable: any[] }>(
    `/accounts/${accountId}/containers/${containerId}/workspaces/${workspaceId}/variables`,
    accessToken
  )
  return (data.variable || []).map((v: any) => ({
    variableId: v.variableId,
    name: v.name,
    type: v.type,
    parameter: v.parameter,
    path: v.path,
  }))
}

export async function deleteTag(
  accessToken: string,
  accountId: string,
  containerId: string,
  workspaceId: string,
  tagId: string
): Promise<void> {
  await gtmFetch(
    `/accounts/${accountId}/containers/${containerId}/workspaces/${workspaceId}/tags/${tagId}`,
    accessToken,
    { method: "DELETE" }
  )
}

export interface CreateTagInput {
  name: string
  type: string
  firingTriggerId?: string[]
  blockingTriggerId?: string[]
  parameter?: any[]
  notes?: string
  paused?: boolean
}

export async function createTag(
  accessToken: string,
  accountId: string,
  containerId: string,
  workspaceId: string,
  input: CreateTagInput
): Promise<{ tagId: string; path: string }> {
  const body: any = {
    name: input.name,
    type: input.type,
  }
  if (input.firingTriggerId) body.firingTriggerId = input.firingTriggerId
  if (input.blockingTriggerId) body.blockingTriggerId = input.blockingTriggerId
  if (input.parameter) body.parameter = input.parameter
  if (input.notes) body.notes = input.notes
  if (input.paused) body.paused = input.paused

  return gtmFetch(
    `/accounts/${accountId}/containers/${containerId}/workspaces/${workspaceId}/tags`,
    accessToken,
    { method: "POST", body: JSON.stringify(body) }
  )
}

export interface UpdateTagInput {
  name?: string
  type?: string
  firingTriggerId?: string[]
  blockingTriggerId?: string[]
  parameter?: any[]
  notes?: string
  paused?: boolean
}

export async function updateTag(
  accessToken: string,
  accountId: string,
  containerId: string,
  workspaceId: string,
  tagId: string,
  input: UpdateTagInput
): Promise<{ tagId: string; path: string }> {
  const body: any = { ...input }
  return gtmFetch(
    `/accounts/${accountId}/containers/${containerId}/workspaces/${workspaceId}/tags/${tagId}`,
    accessToken,
    { method: "PUT", body: JSON.stringify(body) }
  )
}

export interface CreateTriggerInput {
  name: string
  type: string
  parameter?: any[]
  filter?: any[]
  customEventFilter?: any[]
}

export async function createTrigger(
  accessToken: string,
  accountId: string,
  containerId: string,
  workspaceId: string,
  input: CreateTriggerInput
): Promise<{ triggerId: string; path: string }> {
  return gtmFetch(
    `/accounts/${accountId}/containers/${containerId}/workspaces/${workspaceId}/triggers`,
    accessToken,
    { method: "POST", body: JSON.stringify(input) }
  )
}

export async function deleteTrigger(
  accessToken: string,
  accountId: string,
  containerId: string,
  workspaceId: string,
  triggerId: string
): Promise<void> {
  await gtmFetch(
    `/accounts/${accountId}/containers/${containerId}/workspaces/${workspaceId}/triggers/${triggerId}`,
    accessToken,
    { method: "DELETE" }
  )
}

export interface CreateVariableInput {
  name: string
  type: string
  parameter?: any[]
}

export async function createVariable(
  accessToken: string,
  accountId: string,
  containerId: string,
  workspaceId: string,
  input: CreateVariableInput
): Promise<{ variableId: string; path: string }> {
  return gtmFetch(
    `/accounts/${accountId}/containers/${containerId}/workspaces/${workspaceId}/variables`,
    accessToken,
    { method: "POST", body: JSON.stringify(input) }
  )
}

export async function deleteVariable(
  accessToken: string,
  accountId: string,
  containerId: string,
  workspaceId: string,
  variableId: string
): Promise<void> {
  await gtmFetch(
    `/accounts/${accountId}/containers/${containerId}/workspaces/${workspaceId}/variables/${variableId}`,
    accessToken,
    { method: "DELETE" }
  )
}

// Generic entity creation for server template import — supports tags, triggers, variables, clients, templates
export async function createServerEntity(
  accessToken: string,
  accountId: string,
  containerId: string,
  workspaceId: string,
  entityType: "tags" | "triggers" | "variables" | "clients" | "templates",
  body: any
): Promise<any> {
  return gtmFetch(
    `/accounts/${accountId}/containers/${containerId}/workspaces/${workspaceId}/${entityType}`,
    accessToken,
    { method: "POST", body: JSON.stringify(body) }
  )
}

export async function publishVersion(
  accessToken: string,
  accountId: string,
  containerId: string,
  workspaceId: string
): Promise<{ containerVersion: { path: string } }> {
  return gtmFetch(
    `/accounts/${accountId}/containers/${containerId}/workspaces/${workspaceId}:publish`,
    accessToken,
    { method: "POST" }
  )
}

export function runAudit(
  tags: GTMTag[],
  triggers: GTMTrigger[],
  variables: GTMVariable[],
  containerName: string,
  containerId: string
): AuditReport {
  const issues: AuditIssue[] = []

  // Helper: get parameter value from a tag/trigger/variable parameter array
  function getParam(params: any, key: string): string | undefined {
    if (!Array.isArray(params)) return undefined
    const p = params.find((p: any) => p.key === key)
    return p?.value
  }

  // Build lookup maps
  const usedTriggerIds = new Set<string>()
  const usedVariableNames = new Set<string>()
  for (const tag of tags) {
    for (const id of tag.firingTriggerId || []) usedTriggerIds.add(id)
    for (const id of tag.blockingTriggerId || []) usedTriggerIds.add(id)
    // Scan parameter values for {{variable}} references
    if (Array.isArray(tag.parameter)) {
      for (const p of tag.parameter) {
        const matches = (p.value || "").matchAll(/\{\{(.+?)\}\}/g)
        for (const m of matches) usedVariableNames.add(m[1])
      }
    }
  }

  // ═══════════════════════════════════════════════
  // CATEGORY 1: Tag Health
  // ═══════════════════════════════════════════════
  let tagHealthPassed = 0

  for (const tag of tags) {
    let tagOk = true

    // 1a. Orphan tags (no firing triggers)
    if (!tag.firingTriggerId || tag.firingTriggerId.length === 0) {
      issues.push({
        severity: "critical",
        category: "Tag Health",
        message: `Tag "${tag.name}" has no firing triggers`,
        tagId: tag.tagId,
        tagName: tag.name,
        recommendation: "Add a firing trigger or remove this unused tag",
      })
      tagOk = false
    }

    // 1b. Paused tags
    if (tag.paused) {
      issues.push({
        severity: "warning",
        category: "Tag Health",
        message: `Tag "${tag.name}" is paused`,
        tagId: tag.tagId,
        tagName: tag.name,
        recommendation: "Review if this tag is still needed or should be removed",
      })
      tagOk = false
    }

    // 1c. Tags firing on All Pages via "All Pages" trigger (triggerId "2147479553")
    if (tag.firingTriggerId?.includes("2147479553") && tag.type !== "gaawc" && tag.type !== "gclidw") {
      issues.push({
        severity: "info",
        category: "Tag Health",
        message: `Tag "${tag.name}" fires on All Pages`,
        tagId: tag.tagId,
        tagName: tag.name,
        recommendation: "Verify this tag should fire on every page. Consider scoping to specific triggers.",
      })
    }

    if (tagOk) tagHealthPassed++
  }

  // ═══════════════════════════════════════════════
  // CATEGORY 2: Naming Conventions
  // ═══════════════════════════════════════════════
  let namingPassed = 0
  const namingPattern = /^[A-Z0-9]{2,6}\s*[-–]\s*.+/

  // 2a. Tag names
  const tagNameCount = new Map<string, number>()
  for (const tag of tags) {
    tagNameCount.set(tag.name, (tagNameCount.get(tag.name) || 0) + 1)
    if (!namingPattern.test(tag.name)) {
      issues.push({
        severity: "info",
        category: "Naming",
        message: `Tag "${tag.name}" doesn't follow naming convention (e.g., "GA4 - Page View")`,
        tagId: tag.tagId,
        tagName: tag.name,
        recommendation: "Use a PREFIX - Description pattern for consistency (e.g., GA4 - Event Name)",
      })
    } else {
      namingPassed++
    }
  }
  for (const [name, count] of Array.from(tagNameCount.entries())) {
    if (count > 1) {
      issues.push({
        severity: "warning",
        category: "Naming",
        message: `${count} tags share the name "${name}"`,
        recommendation: "Use unique, descriptive names for easier maintenance",
      })
    }
  }

  // 2b. Trigger names
  for (const trigger of triggers) {
    if (!namingPattern.test(trigger.name) && trigger.name !== "All Pages" && trigger.name !== "Initialization - All Pages" && trigger.name !== "Consent Initialization - All Pages") {
      issues.push({
        severity: "info",
        category: "Naming",
        message: `Trigger "${trigger.name}" doesn't follow naming convention`,
        triggerId: trigger.triggerId,
        triggerName: trigger.name,
        recommendation: "Use TYPE - Description pattern (e.g., CE - purchase, CL - CTA Button)",
      })
    } else {
      namingPassed++
    }
  }

  // 2c. Variable names
  for (const v of variables) {
    if (!namingPattern.test(v.name) && !v.name.startsWith("{{")) {
      issues.push({
        severity: "info",
        category: "Naming",
        message: `Variable "${v.name}" doesn't follow naming convention`,
        variableId: v.variableId,
        variableName: v.name,
        recommendation: "Use TYPE - Description pattern (e.g., DLV - Purchase Revenue, CONST - GA4 ID)",
      })
    } else {
      namingPassed++
    }
  }

  // ═══════════════════════════════════════════════
  // CATEGORY 3: GA4 Configuration
  // ═══════════════════════════════════════════════
  let ga4Passed = 0
  const ga4ConfigTags = tags.filter((t) => t.type === "gaawc")
  const ga4EventTags = tags.filter((t) => t.type === "gaawe")

  // 3a. Missing GA4 config
  if (ga4EventTags.length > 0 && ga4ConfigTags.length === 0) {
    issues.push({
      severity: "critical",
      category: "GA4",
      message: "GA4 Event tags found but no GA4 Configuration tag exists",
      recommendation: "Create a GA4 Configuration tag with your Measurement ID",
    })
  } else if (ga4ConfigTags.length > 0) {
    ga4Passed++
  }

  // 3b. Multiple GA4 configs (often a mistake)
  if (ga4ConfigTags.length > 1) {
    issues.push({
      severity: "warning",
      category: "GA4",
      message: `${ga4ConfigTags.length} GA4 Configuration tags found`,
      recommendation: "Typically only one GA4 Config tag is needed per Measurement ID",
    })
  } else if (ga4ConfigTags.length === 1) {
    ga4Passed++
  }

  // 3c. GA4 event tags without measurementIdOverride
  for (const tag of ga4EventTags) {
    const mid = getParam(tag.parameter, "measurementIdOverride")
    if (!mid || mid === "G-XXXXXXXX") {
      issues.push({
        severity: "critical",
        category: "GA4",
        message: `GA4 Event "${tag.name}" has no valid Measurement ID override`,
        tagId: tag.tagId,
        tagName: tag.name,
        recommendation: "Set the measurementIdOverride to your GA4 Measurement ID",
      })
    } else {
      ga4Passed++
    }

    const eventName = getParam(tag.parameter, "eventName")
    if (!eventName) {
      issues.push({
        severity: "critical",
        category: "GA4",
        message: `GA4 Event "${tag.name}" has no event name configured`,
        tagId: tag.tagId,
        tagName: tag.name,
        recommendation: "Set an event name for this GA4 Event tag",
      })
    } else {
      ga4Passed++
    }
  }

  // 3d. GA4 config without measurement ID
  for (const tag of ga4ConfigTags) {
    const mid = getParam(tag.parameter, "measurementId")
    if (!mid || mid === "G-XXXXXXXX") {
      issues.push({
        severity: "critical",
        category: "GA4",
        message: `GA4 Config "${tag.name}" has no valid Measurement ID`,
        tagId: tag.tagId,
        tagName: tag.name,
        recommendation: "Set the measurementId to your GA4 Measurement ID (G-XXXXXXXX)",
      })
    } else {
      ga4Passed++
    }
  }

  // ═══════════════════════════════════════════════
  // CATEGORY 4: Security & Privacy
  // ═══════════════════════════════════════════════
  let securityPassed = 0

  // 4a. Custom HTML tags
  const htmlTags = tags.filter((t) => t.type === "html")
  for (const tag of htmlTags) {
    issues.push({
      severity: "warning",
      category: "Security",
      message: `Tag "${tag.name}" uses Custom HTML — potential XSS risk`,
      tagId: tag.tagId,
      tagName: tag.name,
      recommendation: "Consider using built-in tag templates for better security. Review the HTML code.",
    })
  }
  if (htmlTags.length === 0) securityPassed++

  // 4b. Custom Image tags (pixel tracking — may leak data)
  const imgTags = tags.filter((t) => t.type === "img")
  for (const tag of imgTags) {
    issues.push({
      severity: "info",
      category: "Security",
      message: `Tag "${tag.name}" uses Custom Image (pixel)`,
      tagId: tag.tagId,
      tagName: tag.name,
      recommendation: "Verify the image URL isn't sending PII in query parameters",
    })
  }
  if (imgTags.length === 0) securityPassed++

  // 4c. Consent settings check
  const tagsNeedingConsent = tags.filter((t) => ["gaawc", "gaawe", "awct", "sp", "html", "img"].includes(t.type))
  for (const tag of tagsNeedingConsent) {
    if (!tag.consentSettings || tag.consentSettings.consentStatus === "notSet") {
      issues.push({
        severity: "warning",
        category: "Security",
        message: `Tag "${tag.name}" (${tag.type}) has no consent settings configured`,
        tagId: tag.tagId,
        tagName: tag.name,
        recommendation: "Configure consent settings (ad_storage, analytics_storage) for GDPR/CCPA compliance",
      })
    } else {
      securityPassed++
    }
  }

  // ═══════════════════════════════════════════════
  // CATEGORY 5: Performance
  // ═══════════════════════════════════════════════
  let perfPassed = 0

  // 5a. Too many tags
  if (tags.length > 50) {
    issues.push({
      severity: "warning",
      category: "Performance",
      message: `Container has ${tags.length} tags — may impact page load`,
      recommendation: "Audit unused tags and consider server-side tagging for heavy workloads",
    })
  } else {
    perfPassed++
  }

  // 5b. Custom JS variables (they execute on every event)
  const jsmVars = variables.filter((v) => v.type === "jsm")
  if (jsmVars.length > 5) {
    issues.push({
      severity: "warning",
      category: "Performance",
      message: `${jsmVars.length} Custom JavaScript variables — they run on every GTM event`,
      recommendation: "Minimize Custom JS variables. Use Data Layer variables when possible.",
    })
  } else {
    perfPassed++
  }

  // 5c. Tags without tag sequencing (setup/teardown) that depend on other tags
  // (informational — not always needed)
  const tagsFiringOnAllPages = tags.filter((t) => t.firingTriggerId?.includes("2147479553"))
  if (tagsFiringOnAllPages.length > 10) {
    issues.push({
      severity: "info",
      category: "Performance",
      message: `${tagsFiringOnAllPages.length} tags fire on All Pages`,
      recommendation: "Review if all these tags truly need to fire on every page",
    })
  } else {
    perfPassed++
  }

  // ═══════════════════════════════════════════════
  // CATEGORY 6: Triggers & Variables Hygiene
  // ═══════════════════════════════════════════════
  let hygienePassed = 0

  // 6a. Unused triggers
  for (const trigger of triggers) {
    if (!usedTriggerIds.has(trigger.triggerId) && trigger.name !== "All Pages" && trigger.name !== "Initialization - All Pages" && trigger.name !== "Consent Initialization - All Pages") {
      issues.push({
        severity: "info",
        category: "Hygiene",
        message: `Trigger "${trigger.name}" is not used by any tag`,
        triggerId: trigger.triggerId,
        triggerName: trigger.name,
        recommendation: "Remove unused triggers to keep the container clean",
      })
    } else {
      hygienePassed++
    }
  }

  // 6b. Unused variables (heuristic: check if variable name appears in any tag parameter)
  for (const v of variables) {
    if (!usedVariableNames.has(v.name)) {
      issues.push({
        severity: "info",
        category: "Hygiene",
        message: `Variable "${v.name}" may not be referenced by any tag`,
        variableId: v.variableId,
        variableName: v.name,
        recommendation: "Verify this variable is used. Remove if unused.",
      })
    } else {
      hygienePassed++
    }
  }

  // 6c. Duplicate trigger names
  const trigNameCount = new Map<string, number>()
  for (const t of triggers) {
    trigNameCount.set(t.name, (trigNameCount.get(t.name) || 0) + 1)
  }
  for (const [name, count] of Array.from(trigNameCount.entries())) {
    if (count > 1) {
      issues.push({
        severity: "warning",
        category: "Hygiene",
        message: `${count} triggers share the name "${name}"`,
        recommendation: "Use unique trigger names to avoid confusion",
      })
    }
  }

  // ═══════════════════════════════════════════════
  // Build category summaries
  // ═══════════════════════════════════════════════
  const categoryNames = ["Tag Health", "Naming", "GA4", "Security", "Performance", "Hygiene"]
  const categoryIcons: Record<string, string> = {
    "Tag Health": "heart-pulse",
    Naming: "text-cursor",
    GA4: "bar-chart-3",
    Security: "shield",
    Performance: "zap",
    Hygiene: "sparkles",
  }
  const categoryPassedMap: Record<string, number> = {
    "Tag Health": tagHealthPassed,
    Naming: namingPassed,
    GA4: ga4Passed,
    Security: securityPassed,
    Performance: perfPassed,
    Hygiene: hygienePassed,
  }

  const categories: AuditCategory[] = categoryNames.map((name) => {
    const catIssues = issues.filter((i) => i.category === name)
    return {
      name,
      icon: categoryIcons[name] || "circle",
      critical: catIssues.filter((i) => i.severity === "critical").length,
      warning: catIssues.filter((i) => i.severity === "warning").length,
      info: catIssues.filter((i) => i.severity === "info").length,
      passed: categoryPassedMap[name] || 0,
    }
  })

  const totalCritical = issues.filter((i) => i.severity === "critical").length
  const totalWarnings = issues.filter((i) => i.severity === "warning").length
  const totalInfos = issues.filter((i) => i.severity === "info").length

  const summary: AuditSummary = {
    totalTags: tags.length,
    totalTriggers: triggers.length,
    totalVariables: variables.length,
    criticalIssues: totalCritical,
    warnings: totalWarnings,
    infos: totalInfos,
    score: Math.max(0, Math.round(100 - totalCritical * 15 - totalWarnings * 5 - totalInfos * 1)),
  }

  return {
    id: `audit-${Date.now()}`,
    containerId,
    containerName,
    createdAt: new Date().toISOString(),
    status: "completed",
    issues,
    summary,
    categories,
  }
}
