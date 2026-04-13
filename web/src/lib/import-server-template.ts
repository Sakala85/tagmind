import { createServerEntity } from "./gtm-api"

export interface ImportResult {
  success: boolean
  created: { type: string; name: string; oldId?: string; newId?: string }[]
  errors: { type: string; name: string; error: string }[]
  summary: string
}

/**
 * Strip IDs and metadata fields that should not be sent when creating new entities.
 */
function cleanBody(raw: any): any {
  const { accountId, containerId, tagId, triggerId, variableId, clientId, templateId, fingerprint, ...rest } = raw
  return rest
}

/**
 * Import a GTM server template into a target server container.
 *
 * Flow:
 *  1. Custom templates (e.g. Meta CAPI)
 *  2. Variables (with constant overrides applied)
 *  3. Triggers (tracking oldId → newId)
 *  4. Clients
 *  5. Tags (with trigger IDs remapped)
 */
export async function importServerTemplate(
  accessToken: string,
  accountId: string,
  containerId: string,
  workspaceId: string,
  templateContent: string,
  overrides: Record<string, string>
): Promise<ImportResult> {
  const result: ImportResult = { success: true, created: [], errors: [], summary: "" }
  const triggerIdMap: Record<string, string> = {}

  const parsed = JSON.parse(templateContent)
  const cv = parsed.containerVersion as any
  if (!cv) {
    return { success: false, created: [], errors: [{ type: "template", name: "root", error: "Invalid template: missing containerVersion" }], summary: "❌ Invalid template JSON" }
  }

  // ── 1. Custom templates ──────────────────────────────────────────
  if (cv.customTemplate) {
    for (const tmpl of cv.customTemplate) {
      try {
        const body: any = {
          name: tmpl.name,
          templateData: tmpl.templateData,
        }
        if (tmpl.galleryReference) body.galleryReference = tmpl.galleryReference
        await createServerEntity(accessToken, accountId, containerId, workspaceId, "templates", body)
        result.created.push({ type: "template", name: tmpl.name })
      } catch (e: any) {
        // Template may already exist — non-blocking
        result.errors.push({ type: "template", name: tmpl.name, error: e.message })
      }
    }
  }

  // ── 2. Variables (apply constant overrides) ──────────────────────
  if (cv.variable) {
    for (const v of cv.variable) {
      try {
        const body = cleanBody(v)

        // Apply overrides for constant variables (type "c")
        if (v.type === "c" && overrides[v.name]) {
          body.parameter = (body.parameter || []).map((p: any) =>
            p.key === "value" ? { ...p, value: overrides[v.name] } : p
          )
        }

        const created = await createServerEntity(accessToken, accountId, containerId, workspaceId, "variables", body)
        result.created.push({ type: "variable", name: v.name, newId: created.variableId })
      } catch (e: any) {
        result.errors.push({ type: "variable", name: v.name, error: e.message })
      }
    }
  }

  // ── 3. Triggers (track old→new ID map) ──────────────────────────
  if (cv.trigger) {
    for (const t of cv.trigger) {
      try {
        const body = cleanBody(t)
        const created = await createServerEntity(accessToken, accountId, containerId, workspaceId, "triggers", body)
        triggerIdMap[t.triggerId] = created.triggerId
        result.created.push({ type: "trigger", name: t.name, oldId: t.triggerId, newId: created.triggerId })
      } catch (e: any) {
        result.errors.push({ type: "trigger", name: t.name, error: e.message })
      }
    }
  }

  // ── 4. Clients ──────────────────────────────────────────────────
  if (cv.client) {
    for (const c of cv.client) {
      try {
        const body = cleanBody(c)
        await createServerEntity(accessToken, accountId, containerId, workspaceId, "clients", body)
        result.created.push({ type: "client", name: c.name })
      } catch (e: any) {
        result.errors.push({ type: "client", name: c.name, error: e.message })
      }
    }
  }

  // ── 5. Tags (remap trigger IDs) ────────────────────────────────
  if (cv.tag) {
    for (const t of cv.tag) {
      try {
        const body = cleanBody(t)

        // Remap firing trigger IDs
        if (body.firingTriggerId) {
          body.firingTriggerId = body.firingTriggerId.map((id: string) => triggerIdMap[id] || id)
        }
        if (body.blockingTriggerId) {
          body.blockingTriggerId = body.blockingTriggerId.map((id: string) => triggerIdMap[id] || id)
        }

        await createServerEntity(accessToken, accountId, containerId, workspaceId, "tags", body)
        result.created.push({ type: "tag", name: t.name })
      } catch (e: any) {
        result.errors.push({ type: "tag", name: t.name, error: e.message })
      }
    }
  }

  // ── Summary ─────────────────────────────────────────────────────
  const counts: Record<string, number> = {}
  for (const c of result.created) {
    counts[c.type] = (counts[c.type] || 0) + 1
  }
  const parts = Object.entries(counts).map(([k, v]) => `${v} ${k}${v > 1 ? "s" : ""}`)

  result.success = result.errors.length === 0
  result.summary = result.errors.length === 0
    ? `✅ Server template installed successfully! Created: ${parts.join(", ")}.`
    : `⚠️ Server template installed with ${result.errors.length} error(s). Created: ${parts.join(", ")}. Errors:\n${result.errors.map((e) => `- ${e.type} "${e.name}": ${e.error}`).join("\n")}`

  return result
}

/**
 * Extract constant variables from any template JSON string.
 */
export function extractTemplateConstants(templateContent: string): { name: string; placeholder: string }[] {
  try {
    const parsed = JSON.parse(templateContent)
    const cv = parsed.containerVersion
    if (!cv?.variable) return []

    return cv.variable
      .filter((v: any) => v.type === "c")
      .map((v: any) => ({
        name: v.name,
        placeholder: v.parameter?.find((p: any) => p.key === "value")?.value || "",
      }))
  } catch {
    return []
  }
}
