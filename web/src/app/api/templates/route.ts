import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { seedDefaultTemplates } from "@/lib/default-templates"

// GET /api/templates — list all templates for the current user
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Ensure default templates exist for this user
  await seedDefaultTemplates(session.user.id)

  const templates = await prisma.serverTemplate.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      description: true,
      fileName: true,
      constants: true,
      tagCount: true,
      triggerCount: true,
      variableCount: true,
      clientCount: true,
      createdAt: true,
    },
  })

  return NextResponse.json({ templates })
}

// POST /api/templates — upload a new template
export async function POST(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { name, description, fileName, content } = await request.json()

    if (!name || !content) {
      return NextResponse.json({ error: "Name and content are required" }, { status: 400 })
    }

    // Parse and validate the template JSON
    let parsed: any
    try {
      parsed = JSON.parse(content)
    } catch {
      return NextResponse.json({ error: "Invalid JSON content" }, { status: 400 })
    }

    const cv = parsed.containerVersion
    if (!cv) {
      return NextResponse.json({ error: "Invalid GTM export: missing containerVersion" }, { status: 400 })
    }

    // Extract stats
    const tagCount = cv.tag?.length || 0
    const triggerCount = cv.trigger?.length || 0
    const variableCount = cv.variable?.length || 0
    const clientCount = cv.client?.length || 0

    // Extract constant variables
    const constants = (cv.variable || [])
      .filter((v: any) => v.type === "c")
      .map((v: any) => ({
        name: v.name,
        placeholder: v.parameter?.find((p: any) => p.key === "value")?.value || "",
      }))

    const template = await prisma.serverTemplate.create({
      data: {
        userId: session.user.id,
        name,
        description: description || null,
        fileName: fileName || "template.json",
        content,
        constants: JSON.stringify(constants),
        tagCount,
        triggerCount,
        variableCount,
        clientCount,
      },
    })

    return NextResponse.json({
      template: {
        id: template.id,
        name: template.name,
        description: template.description,
        fileName: template.fileName,
        constants: template.constants,
        tagCount,
        triggerCount,
        variableCount,
        clientCount,
        createdAt: template.createdAt,
      },
    })
  } catch (error: any) {
    console.error("Template upload error:", error)
    return NextResponse.json({ error: error.message || "Upload failed" }, { status: 500 })
  }
}
