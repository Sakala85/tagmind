"use client"

import { useAccounts } from "@/hooks/use-gtm"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Box, Tags, Zap, Variable, AlertCircle } from "lucide-react"
import Link from "next/link"

export default function DashboardPage() {
  const { accounts, loading, error } = useAccounts()

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
        <p className="text-red-600 font-medium">{error}</p>
        <p className="text-sm text-muted-foreground">Make sure your Google account has access to GTM.</p>
      </div>
    )
  }

  const totalContainers = accounts.reduce((acc, a) => acc + a.containers.length, 0)

  return (
    <div className="space-y-8">
      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-4 p-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
              <Box className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Accounts</p>
              <p className="text-2xl font-bold">{accounts.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-500/15">
              <Tags className="h-6 w-6 text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Containers</p>
              <p className="text-2xl font-bold">{totalContainers}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-amber-500/15">
              <Zap className="h-6 w-6 text-amber-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Quick Actions</p>
              <Link href="/dashboard/audit" className="text-sm text-primary hover:underline font-medium">
                Run Audit
              </Link>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-purple-500/15">
              <Variable className="h-6 w-6 text-purple-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">AI Agent</p>
              <Link href="/dashboard/agent" className="text-sm text-primary hover:underline font-medium">
                Start Chat
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Accounts & Containers */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Your GTM Accounts</h2>
        {accounts.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <Box className="h-12 w-12 text-muted-foreground/40 mb-4" />
              <p className="text-muted-foreground">No GTM accounts found.</p>
              <p className="text-sm text-muted-foreground mt-1">
                Make sure your Google account has access to Google Tag Manager.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {accounts.map((account) => (
              <Card key={account.accountId} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{account.name}</CardTitle>
                    <Badge variant="secondary">ID: {account.accountId}</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  {account.containers.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No containers</p>
                  ) : (
                    <div className="space-y-2">
                      {account.containers.map((container) => (
                        <Link
                          key={container.containerId}
                          href={`/dashboard/tags?accountId=${account.accountId}&containerId=${container.containerId}&name=${encodeURIComponent(container.name)}`}
                          className="flex items-center justify-between rounded-lg border border-border p-3 hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10">
                              <Box className="h-4 w-4 text-primary" />
                            </div>
                            <div>
                              <p className="text-sm font-medium">{container.name}</p>
                              <p className="text-xs text-muted-foreground">{container.publicId}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {container.usageContext?.map((ctx) => (
                              <Badge key={ctx} variant="default" className="text-xs">
                                {ctx === "web" ? "Web" : ctx === "server" ? "Server" : ctx}
                              </Badge>
                            ))}
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
