export interface GTMAccount {
  accountId: string
  name: string
  path: string
}

export interface GTMContainer {
  containerId: string
  name: string
  publicId: string
  usageContext: string[]
  domainName?: string[]
  path: string
  accountId: string
}

export interface GTMWorkspace {
  workspaceId: string
  name: string
  description?: string
  path: string
  accountId: string
  containerId: string
}

export interface GTMTag {
  tagId: string
  name: string
  type: string
  parameter?: any
  firingTriggerId?: string[]
  blockingTriggerId?: string[]
  setupTag?: TagSequenceRef[]
  teardownTag?: TagSequenceRef[]
  consentSettings?: TagConsentSettings
  paused?: boolean
  path: string
}

export interface TagSequenceRef {
  tagName: string
  stopOnFailure?: boolean
}

export interface TagConsentSettings {
  consentStatus: string
  consentTypes?: string[]
}

export interface GTMTrigger {
  triggerId: string
  name: string
  type: string
  parameter?: any
  filter?: any[]
  path: string
}

export interface GTMVariable {
  variableId: string
  name: string
  type: string
  parameter?: any
  path: string
}

export interface AuditReport {
  id: string
  containerId: string
  containerName: string
  createdAt: string
  status: "pending" | "running" | "completed" | "failed"
  issues: AuditIssue[]
  summary?: AuditSummary
  categories?: AuditCategory[]
}

export interface AuditIssue {
  severity: "critical" | "warning" | "info"
  category: string
  message: string
  tagId?: string
  tagName?: string
  triggerId?: string
  triggerName?: string
  variableId?: string
  variableName?: string
  recommendation: string
}

export interface AuditSummary {
  totalTags: number
  totalTriggers: number
  totalVariables: number
  criticalIssues: number
  warnings: number
  infos: number
  score: number
}

export interface AuditCategory {
  name: string
  icon: string
  critical: number
  warning: number
  info: number
  passed: number
}
