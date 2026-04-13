import { prisma } from "./prisma"
import serverTemplateJson from "@/GTM-KJTWSMJ7_workspace13.json"
import shopifyTemplateJson from "@/GTM-5CC6D6DB_workspace7.json"

interface DefaultTemplateDef {
  slug: string
  name: string
  description: string
  fileName: string
  content: any // raw JSON object
}

const DEFAULT_TEMPLATES: DefaultTemplateDef[] = [
  {
    slug: "default-server",
    name: "Default Configuration Server",
    description: "Sirdata server-side tracking: GA4, Meta CAPI, Google Ads Remarketing & Conversions",
    fileName: "GTM-KJTWSMJ7_workspace13.json",
    content: serverTemplateJson,
  },
  {
    slug: "default-shopify",
    name: "Default Configuration Shopify",
    description: "Sirdata client-side Shopify tracking: GA4, CMP, ecommerce events",
    fileName: "GTM-5CC6D6DB_workspace7.json",
    content: shopifyTemplateJson,
  },
]

function extractStats(cv: any) {
  return {
    tagCount: cv.tag?.length || 0,
    triggerCount: cv.trigger?.length || 0,
    variableCount: cv.variable?.length || 0,
    clientCount: cv.client?.length || 0,
  }
}

function extractConstants(cv: any): { name: string; placeholder: string }[] {
  return (cv.variable || [])
    .filter((v: any) => v.type === "c")
    .map((v: any) => ({
      name: v.name,
      placeholder: v.parameter?.find((p: any) => p.key === "value")?.value || "",
    }))
}

/**
 * Ensures default templates exist for a given user.
 * Called lazily on first access (GET /api/templates or agent chat).
 * Uses the slug in the name field to detect existing defaults — won't duplicate.
 */
export async function seedDefaultTemplates(userId: string): Promise<void> {
  // Check which defaults already exist for this user
  const existing = await prisma.serverTemplate.findMany({
    where: { userId },
    select: { fileName: true },
  })
  const existingFileNames = new Set(existing.map((t) => t.fileName))

  const toCreate = DEFAULT_TEMPLATES.filter((d) => !existingFileNames.has(d.fileName))
  if (toCreate.length === 0) return

  for (const def of toCreate) {
    const contentStr = JSON.stringify(def.content)
    const cv = def.content.containerVersion
    const stats = extractStats(cv)
    const constants = extractConstants(cv)

    await prisma.serverTemplate.create({
      data: {
        userId,
        name: def.name,
        description: def.description,
        fileName: def.fileName,
        content: contentStr,
        constants: JSON.stringify(constants),
        ...stats,
      },
    })
  }
}
