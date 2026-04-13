"use client"

import { useState, useMemo } from "react"
import { useAccounts, useAudit } from "@/hooks/use-gtm"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import type { AuditIssue, AuditCategory } from "@/types/gtm"
import {
  ClipboardCheck,
  AlertTriangle,
  AlertCircle,
  Info,
  CheckCircle2,
  Loader2,
  HeartPulse,
  TextCursor,
  BarChart3,
  Shield,
  Zap,
  Sparkles,
  ChevronRight,
  Tag,
  Filter,
  Variable,
} from "lucide-react"

// ── Score Ring SVG ──
function ScoreRing({ score, size = 120 }: { score: number; size?: number }) {
  const stroke = 10
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (score / 100) * circumference
  const color = score >= 80 ? "#22c55e" : score >= 50 ? "#f59e0b" : "#ef4444"

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
          className="text-muted/20"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-bold" style={{ color }}>
          {score}
        </span>
        <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          / 100
        </span>
      </div>
    </div>
  )
}

// ── Category icon resolver ──
const CATEGORY_ICONS: Record<string, React.ElementType> = {
  "heart-pulse": HeartPulse,
  "text-cursor": TextCursor,
  "bar-chart-3": BarChart3,
  shield: Shield,
  zap: Zap,
  sparkles: Sparkles,
}

function CategoryIcon({ icon, className }: { icon: string; className?: string }) {
  const Icon = CATEGORY_ICONS[icon] || Info
  return <Icon className={className} />
}

// ── Severity filter tabs ──
type SeverityFilter = "all" | "critical" | "warning" | "info"

function SeverityTabs({
  active,
  onChange,
  counts,
}: {
  active: SeverityFilter
  onChange: (f: SeverityFilter) => void
  counts: { all: number; critical: number; warning: number; info: number }
}) {
  const tabs: { key: SeverityFilter; label: string; color: string; Icon: React.ElementType }[] = [
    { key: "all", label: "All", color: "text-foreground", Icon: Filter },
    { key: "critical", label: "Critical", color: "text-red-600", Icon: AlertCircle },
    { key: "warning", label: "Warnings", color: "text-amber-600", Icon: AlertTriangle },
    { key: "info", label: "Info", color: "text-blue-600", Icon: Info },
  ]

  return (
    <div className="flex gap-1 rounded-lg border border-border bg-muted/40 p-1">
      {tabs.map(({ key, label, color, Icon }) => (
        <button
          key={key}
          onClick={() => onChange(key)}
          className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
            active === key
              ? "bg-white shadow-sm " + color
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Icon className="h-3.5 w-3.5" />
          {label}
          <span className="ml-0.5 tabular-nums">({counts[key]})</span>
        </button>
      ))}
    </div>
  )
}

// ── Entity badge (tag / trigger / variable) ──
function EntityBadge({ issue }: { issue: AuditIssue }) {
  if (issue.tagName)
    return (
      <Badge variant="outline" className="gap-1 text-[10px]">
        <Tag className="h-2.5 w-2.5" />
        {issue.tagName}
      </Badge>
    )
  if (issue.triggerName)
    return (
      <Badge variant="outline" className="gap-1 text-[10px]">
        <Filter className="h-2.5 w-2.5" />
        {issue.triggerName}
      </Badge>
    )
  if (issue.variableName)
    return (
      <Badge variant="outline" className="gap-1 text-[10px]">
        <Variable className="h-2.5 w-2.5" />
        {issue.variableName}
      </Badge>
    )
  return null
}

// ── Issue row ──
function IssueRow({ issue }: { issue: AuditIssue }) {
  const bg =
    issue.severity === "critical"
      ? "border-red-200 bg-red-50/60"
      : issue.severity === "warning"
      ? "border-amber-200 bg-amber-50/60"
      : "border-blue-200 bg-blue-50/60"

  const SevIcon =
    issue.severity === "critical" ? AlertCircle : issue.severity === "warning" ? AlertTriangle : Info
  const sevColor =
    issue.severity === "critical" ? "text-red-500" : issue.severity === "warning" ? "text-amber-500" : "text-blue-500"

  return (
    <div className={`rounded-xl border p-4 transition-all hover:shadow-sm ${bg}`}>
      <div className="flex items-start gap-3">
        <SevIcon className={`mt-0.5 h-4 w-4 shrink-0 ${sevColor}`} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-foreground">{issue.category}</span>
            <EntityBadge issue={issue} />
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{issue.message}</p>
          <div className="mt-2 flex items-start gap-1.5">
            <ChevronRight className="mt-0.5 h-3 w-3 shrink-0 text-primary" />
            <p className="text-xs font-medium text-primary">{issue.recommendation}</p>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Category card ──
function CategoryCard({
  category,
  onClick,
  isActive,
}: {
  category: AuditCategory
  onClick: () => void
  isActive: boolean
}) {
  const total = category.critical + category.warning + category.info
  const hasIssues = total > 0

  return (
    <button
      onClick={onClick}
      className={`flex flex-col gap-3 rounded-xl border p-4 text-left transition-all hover:shadow-md ${
        isActive ? "border-primary bg-primary/5 shadow-sm" : "border-border hover:border-primary/30"
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className={`rounded-lg p-2 ${hasIssues ? "bg-amber-100" : "bg-emerald-100"}`}>
            <CategoryIcon icon={category.icon} className={`h-4 w-4 ${hasIssues ? "text-amber-700" : "text-emerald-700"}`} />
          </div>
          <span className="text-sm font-semibold">{category.name}</span>
        </div>
        {!hasIssues && <CheckCircle2 className="h-4 w-4 text-green-500" />}
      </div>
      <div className="flex items-center gap-2">
        {category.critical > 0 && (
          <span className="flex items-center gap-1 text-[11px] font-medium text-red-600">
            <AlertCircle className="h-3 w-3" />
            {category.critical}
          </span>
        )}
        {category.warning > 0 && (
          <span className="flex items-center gap-1 text-[11px] font-medium text-amber-600">
            <AlertTriangle className="h-3 w-3" />
            {category.warning}
          </span>
        )}
        {category.info > 0 && (
          <span className="flex items-center gap-1 text-[11px] font-medium text-blue-600">
            <Info className="h-3 w-3" />
            {category.info}
          </span>
        )}
        {category.passed > 0 && (
          <span className="flex items-center gap-1 text-[11px] font-medium text-emerald-600">
            <CheckCircle2 className="h-3 w-3" />
            {category.passed} passed
          </span>
        )}
      </div>
    </button>
  )
}

// ═══════════════════════════════════════════════
// Main page
// ═══════════════════════════════════════════════
export default function AuditPage() {
  const { accounts, loading: accountsLoading } = useAccounts()
  const { report, loading: auditLoading, error, runAudit } = useAudit()
  const [selectedContainer, setSelectedContainer] = useState<{
    accountId: string
    containerId: string
    name: string
  } | null>(null)
  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>("all")
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null)

  const allContainers = accounts.flatMap((a) =>
    a.containers.map((c) => ({
      accountId: a.accountId,
      containerId: c.containerId,
      name: c.name,
      accountName: a.name,
    }))
  )

  const filteredIssues = useMemo(() => {
    if (!report) return []
    return report.issues.filter((i) => {
      if (severityFilter !== "all" && i.severity !== severityFilter) return false
      if (categoryFilter && i.category !== categoryFilter) return false
      return true
    })
  }, [report, severityFilter, categoryFilter])

  const handleRunAudit = async () => {
    if (!selectedContainer) return
    setSeverityFilter("all")
    setCategoryFilter(null)
    await runAudit(selectedContainer.accountId, selectedContainer.containerId, selectedContainer.name)
  }

  const score = report?.summary?.score ?? 0

  return (
    <div className="mx-auto max-w-5xl space-y-8 pb-12">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Container Audit</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Comprehensive analysis of your tag plan — health, naming, GA4, security, performance &amp; hygiene.
        </p>
      </div>

      {/* Container selector */}
      <Card className="overflow-hidden">
        <CardHeader className="border-b bg-muted/30 py-4">
          <CardTitle className="text-sm font-medium text-muted-foreground">Select a container to audit</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 pt-4">
          {accountsLoading ? (
            <div className="flex items-center gap-2 py-6 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading containers...
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {allContainers.map((c) => (
                  <button
                    key={c.containerId}
                    onClick={() => setSelectedContainer(c)}
                    className={`flex flex-col items-start rounded-xl border p-3.5 text-left transition-all ${
                      selectedContainer?.containerId === c.containerId
                        ? "border-primary bg-primary/5 shadow-sm"
                        : "border-border hover:border-primary/30 hover:bg-muted/50 hover:shadow-sm"
                    }`}
                  >
                    <span className="text-sm font-semibold">{c.name}</span>
                    <span className="mt-0.5 text-xs text-muted-foreground">{c.accountName}</span>
                  </button>
                ))}
              </div>
              <Button
                onClick={handleRunAudit}
                disabled={!selectedContainer || auditLoading}
                size="lg"
                className="gap-2"
              >
                {auditLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ClipboardCheck className="h-4 w-4" />
                )}
                {auditLoading ? "Analyzing tag plan..." : "Run Full Audit"}
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-4">
          <AlertCircle className="h-5 w-5 shrink-0 text-red-600" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Report */}
      {report && (
        <div className="space-y-8">
          {/* ── Score header ── */}
          <Card className="overflow-hidden">
            <CardContent className="p-0">
              <div className="flex flex-col items-center gap-6 p-8 sm:flex-row sm:items-center">
                <ScoreRing score={score} />
                <div className="flex-1 text-center sm:text-left">
                  <h2 className="text-xl font-bold">{report.containerName}</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Audited on {new Date(report.createdAt).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </p>
                  <div className="mt-4 flex flex-wrap justify-center gap-4 sm:justify-start">
                    <Stat label="Tags" value={report.summary?.totalTags ?? 0} icon={Tag} />
                    <Stat label="Triggers" value={report.summary?.totalTriggers ?? 0} icon={Filter} />
                    <Stat label="Variables" value={report.summary?.totalVariables ?? 0} icon={Variable} />
                  </div>
                  <div className="mt-4 flex flex-wrap justify-center gap-2 sm:justify-start">
                    {(report.summary?.criticalIssues ?? 0) > 0 && (
                      <Badge variant="destructive" className="gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {report.summary?.criticalIssues} Critical
                      </Badge>
                    )}
                    {(report.summary?.warnings ?? 0) > 0 && (
                      <Badge variant="warning" className="gap-1">
                        <AlertTriangle className="h-3 w-3" />
                        {report.summary?.warnings} Warnings
                      </Badge>
                    )}
                    {(report.summary?.infos ?? 0) > 0 && (
                      <Badge variant="secondary" className="gap-1">
                        <Info className="h-3 w-3" />
                        {report.summary?.infos} Info
                      </Badge>
                    )}
                    {report.issues.length === 0 && (
                      <Badge variant="success" className="gap-1">
                        <CheckCircle2 className="h-3 w-3" />
                        Perfect score!
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* ── Category cards grid ── */}
          {report.categories && report.categories.length > 0 && (
            <div>
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Audit Categories
              </h3>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                {report.categories.map((cat) => (
                  <CategoryCard
                    key={cat.name}
                    category={cat}
                    isActive={categoryFilter === cat.name}
                    onClick={() =>
                      setCategoryFilter((prev) => (prev === cat.name ? null : cat.name))
                    }
                  />
                ))}
              </div>
            </div>
          )}

          {/* ── Issues list ── */}
          {report.issues.length > 0 && (
            <div className="space-y-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  Issues {categoryFilter && `— ${categoryFilter}`}{" "}
                  <span className="ml-1 text-xs font-normal normal-case">
                    ({filteredIssues.length} of {report.issues.length})
                  </span>
                </h3>
                <SeverityTabs
                  active={severityFilter}
                  onChange={setSeverityFilter}
                  counts={{
                    all: categoryFilter
                      ? report.issues.filter((i) => i.category === categoryFilter).length
                      : report.issues.length,
                    critical: report.issues.filter(
                      (i) =>
                        i.severity === "critical" &&
                        (!categoryFilter || i.category === categoryFilter)
                    ).length,
                    warning: report.issues.filter(
                      (i) =>
                        i.severity === "warning" &&
                        (!categoryFilter || i.category === categoryFilter)
                    ).length,
                    info: report.issues.filter(
                      (i) =>
                        i.severity === "info" &&
                        (!categoryFilter || i.category === categoryFilter)
                    ).length,
                  }}
                />
              </div>
              <div className="space-y-2">
                {filteredIssues.map((issue, i) => (
                  <IssueRow key={i} issue={issue} />
                ))}
                {filteredIssues.length === 0 && (
                  <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed py-12 text-muted-foreground">
                    <CheckCircle2 className="h-8 w-8 text-green-400" />
                    <p className="text-sm">No issues matching this filter</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Small stat chip ──
function Stat({ label, value, icon: Icon }: { label: string; value: number; icon: React.ElementType }) {
  return (
    <div className="flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-1.5">
      <Icon className="h-3.5 w-3.5 text-muted-foreground" />
      <span className="text-sm font-semibold tabular-nums">{value}</span>
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  )
}
