"use client"

import { useSearchParams } from "next/navigation"
import { useWorkspaceData } from "@/hooks/use-gtm"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Tags,
  Zap,
  Variable,
  AlertCircle,
  ArrowLeft,
  Pause,
  Code,
  BarChart3,
} from "lucide-react"
import Link from "next/link"
import { useState } from "react"

const TAG_TYPE_LABELS: Record<string, string> = {
  gaawe: "GA4 Event",
  gaawc: "GA4 Config",
  html: "Custom HTML",
  img: "Custom Image",
  cvt_: "Community Template",
  googtag: "Google Tag",
  gclidw: "Conversion Linker",
  sp: "Google Ads",
  flc: "Floodlight Counter",
  fls: "Floodlight Sales",
}

function getTagLabel(type: string): string {
  if (type.startsWith("cvt_")) return "Community Template"
  return TAG_TYPE_LABELS[type] || type
}

type TabType = "tags" | "triggers" | "variables"

export default function TagsPage() {
  const searchParams = useSearchParams()
  const accountId = searchParams.get("accountId") || ""
  const containerId = searchParams.get("containerId") || ""
  const containerName = searchParams.get("name") || "Container"

  const { data, loading, error } = useWorkspaceData(accountId, containerId)
  const [activeTab, setActiveTab] = useState<TabType>("tags")

  if (!accountId || !containerId) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <AlertCircle className="h-12 w-12 text-amber-400" />
        <p className="text-muted-foreground">Select a container from the Dashboard or Containers page.</p>
        <Link href="/dashboard">
          <Button variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
        </Link>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <AlertCircle className="h-12 w-12 text-red-400" />
        <p className="text-red-400 font-medium">{error}</p>
      </div>
    )
  }

  const tags = data?.tags || []
  const triggers = data?.triggers || []
  const variables = data?.variables || []

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/dashboard">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h2 className="text-lg font-semibold">{containerName}</h2>
          <p className="text-sm text-muted-foreground">
            Workspace: {data?.activeWorkspace?.name || "Default"}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-lg bg-muted border border-border p-1">
        {([
          { id: "tags" as TabType, label: "Tags", icon: Tags, count: tags.length },
          { id: "triggers" as TabType, label: "Triggers", icon: Zap, count: triggers.length },
          { id: "variables" as TabType, label: "Variables", icon: Variable, count: variables.length },
        ]).map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? "bg-white text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
            <span className="ml-1 rounded-full bg-muted-foreground/10 px-2 py-0.5 text-xs">
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Content */}
      {activeTab === "tags" && (
        <div className="space-y-3">
          {tags.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center py-12">
                <Tags className="h-12 w-12 text-muted-foreground/40 mb-4" />
                <p className="text-muted-foreground">No tags in this workspace.</p>
              </CardContent>
            </Card>
          ) : (
            tags.map((tag) => (
              <Card key={tag.tagId} className="hover:shadow-sm transition-shadow">
                <CardContent className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                      {tag.type === "html" ? (
                        <Code className="h-5 w-5 text-primary" />
                      ) : tag.type === "gaawe" || tag.type === "gaawc" ? (
                        <BarChart3 className="h-5 w-5 text-primary" />
                      ) : (
                        <Tags className="h-5 w-5 text-primary" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-sm">{tag.name}</p>
                      <p className="text-xs text-muted-foreground">{getTagLabel(tag.type)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {tag.paused && (
                      <Badge variant="warning" className="gap-1">
                        <Pause className="h-3 w-3" />
                        Paused
                      </Badge>
                    )}
                    {tag.firingTriggerId && (
                      <Badge variant="secondary" className="text-xs">
                        {tag.firingTriggerId.length} trigger{tag.firingTriggerId.length !== 1 ? "s" : ""}
                      </Badge>
                    )}
                    <Badge variant="outline" className="text-xs font-mono">
                      #{tag.tagId}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      {activeTab === "triggers" && (
        <div className="space-y-3">
          {triggers.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center py-12">
                <Zap className="h-12 w-12 text-muted-foreground/40 mb-4" />
                <p className="text-muted-foreground">No triggers in this workspace.</p>
              </CardContent>
            </Card>
          ) : (
            triggers.map((trigger) => (
              <Card key={trigger.triggerId} className="hover:shadow-sm transition-shadow">
                <CardContent className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/15">
                      <Zap className="h-5 w-5 text-amber-400" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{trigger.name}</p>
                      <p className="text-xs text-muted-foreground">{trigger.type}</p>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-xs font-mono">
                    #{trigger.triggerId}
                  </Badge>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      {activeTab === "variables" && (
        <div className="space-y-3">
          {variables.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center py-12">
                <Variable className="h-12 w-12 text-muted-foreground/40 mb-4" />
                <p className="text-muted-foreground">No custom variables in this workspace.</p>
              </CardContent>
            </Card>
          ) : (
            variables.map((variable) => (
              <Card key={variable.variableId} className="hover:shadow-sm transition-shadow">
                <CardContent className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-500/15">
                      <Variable className="h-5 w-5 text-purple-400" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{variable.name}</p>
                      <p className="text-xs text-muted-foreground">{variable.type}</p>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-xs font-mono">
                    #{variable.variableId}
                  </Badge>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}
    </div>
  )
}
