import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    })
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const reports = await prisma.auditReport.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 20,
    })

    const parsed = reports.map((r) => ({
      ...r,
      issues: JSON.parse(r.issues),
    }))

    return NextResponse.json(parsed)
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch audit history" },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    })
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const body = await request.json()

    const report = await prisma.auditReport.create({
      data: {
        userId: user.id,
        accountId: body.accountId,
        containerId: body.containerId,
        containerName: body.containerName,
        score: body.summary?.score ?? 0,
        totalTags: body.summary?.totalTags ?? 0,
        totalTriggers: body.summary?.totalTriggers ?? 0,
        totalVariables: body.summary?.totalVariables ?? 0,
        criticalIssues: body.summary?.criticalIssues ?? 0,
        warnings: body.summary?.warnings ?? 0,
        infos: body.summary?.infos ?? 0,
        issues: JSON.stringify(body.issues ?? []),
      },
    })

    return NextResponse.json(report)
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to save audit report" },
      { status: 500 }
    )
  }
}
