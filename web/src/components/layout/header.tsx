"use client"

import { usePathname } from "next/navigation"
import { useState, useEffect } from "react"
import { RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"

const titleMap: Record<string, { label: string; emoji: string }> = {
  "/dashboard":            { label: "Dashboard",  emoji: "📊" },
  "/dashboard/containers": { label: "Containers", emoji: "📦" },
  "/dashboard/tags":       { label: "Tags",       emoji: "🏷️" },
  "/dashboard/audit":      { label: "Audit",      emoji: "🔍" },
  "/dashboard/templates":  { label: "Templates",  emoji: "📁" },
  "/dashboard/agent":      { label: "Agent IA",   emoji: "🤖" },
}

export function Header() {
  const pathname = usePathname()
  const [syncing, setSyncing] = useState(false)
  const [syncStatus, setSyncStatus] = useState<{ syncedAt: string | null; stats: any } | null>(null)
  const [justSynced, setJustSynced] = useState(false)

  const current = Object.entries(titleMap).find(
    ([path]) => pathname === path || pathname.startsWith(path + "/")
  )?.[1] || { label: "Dashboard", emoji: "📊" }

  useEffect(() => {
    fetch("/api/gtm/sync")
      .then((res) => res.json())
      .then(setSyncStatus)
      .catch(() => {})
  }, [])

  const handleSync = async () => {
    setSyncing(true)
    setJustSynced(false)
    try {
      const res = await fetch("/api/gtm/sync", { method: "POST" })
      if (res.ok) {
        const data = await res.json()
        setSyncStatus({ syncedAt: data.syncedAt, stats: null })
        setJustSynced(true)
        setTimeout(() => setJustSynced(false), 3000)
      }
    } catch (e) {
      console.error("Sync failed:", e)
    } finally {
      setSyncing(false)
    }
  }

  return (
    <header className="flex h-14 items-center justify-between border-b border-border bg-white px-6">
      {/* Page title */}
      <div className="flex items-center gap-2.5">
        <span className="text-base">{current.emoji}</span>
        <h1 className="text-sm font-semibold text-foreground">{current.label}</h1>
      </div>

      {/* Right actions */}
      <div className="flex items-center gap-3">
        {syncStatus?.syncedAt && !syncing && (
          <span className="hidden sm:block text-xs text-muted-foreground">
            Sync {new Date(syncStatus.syncedAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
          </span>
        )}
        {justSynced && (
          <span className="text-xs text-emerald-600 font-medium animate-fade-in">
            ✓ Synchronisé
          </span>
        )}
        <Button
          size="sm"
          variant="outline"
          onClick={handleSync}
          disabled={syncing}
          className="gap-2 h-8 px-3 text-xs"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${syncing ? "animate-spin" : ""}`} />
          {syncing ? "Sync…" : "Sync GTM"}
        </Button>
      </div>
    </header>
  )
}
