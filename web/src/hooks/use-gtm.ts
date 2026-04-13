"use client"

import { useState, useEffect, useCallback } from "react"
import type { GTMContainer, GTMTag, GTMTrigger, GTMVariable, GTMWorkspace, AuditReport } from "@/types/gtm"

interface AccountWithContainers {
  accountId: string
  name: string
  path: string
  containers: GTMContainer[]
}

interface WorkspaceData {
  workspaces: GTMWorkspace[]
  tags: GTMTag[]
  triggers: GTMTrigger[]
  variables: GTMVariable[]
  activeWorkspace?: GTMWorkspace
}

export function useAccounts() {
  const [accounts, setAccounts] = useState<AccountWithContainers[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchAccounts = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/gtm/accounts")
      if (!res.ok) throw new Error((await res.json()).error || "Failed to fetch accounts")
      setAccounts(await res.json())
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAccounts()
  }, [fetchAccounts])

  return { accounts, loading, error, refetch: fetchAccounts }
}

export function useWorkspaceData(accountId?: string, containerId?: string) {
  const [data, setData] = useState<WorkspaceData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    if (!accountId || !containerId) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(
        `/api/gtm/workspace?accountId=${accountId}&containerId=${containerId}`
      )
      if (!res.ok) throw new Error((await res.json()).error || "Failed to fetch workspace")
      setData(await res.json())
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [accountId, containerId])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return { data, loading, error, refetch: fetchData }
}

export function useAudit() {
  const [report, setReport] = useState<AuditReport | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const runAudit = useCallback(
    async (accountId: string, containerId: string, containerName: string) => {
      setLoading(true)
      setError(null)
      setReport(null)
      try {
        const res = await fetch("/api/gtm/audit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ accountId, containerId, containerName }),
        })
        if (!res.ok) throw new Error((await res.json()).error || "Audit failed")
        const data = await res.json()
        setReport(data)
        // Save to audit history
        fetch("/api/gtm/audit-history", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...data, accountId, containerId }),
        }).catch(() => {})
        return data
      } catch (e: any) {
        setError(e.message)
      } finally {
        setLoading(false)
      }
    },
    []
  )

  return { report, loading, error, runAudit }
}
