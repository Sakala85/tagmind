"use client"

import { useAccounts } from "@/hooks/use-gtm"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Box, Globe, Server, AlertCircle } from "lucide-react"
import Link from "next/link"

export default function ContainersPage() {
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
      </div>
    )
  }

  const allContainers = accounts.flatMap((a) =>
    a.containers.map((c) => ({ ...c, accountName: a.name, accountId: a.accountId }))
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">All Containers</h2>
          <p className="text-sm text-muted-foreground">{allContainers.length} containers across {accounts.length} accounts</p>
        </div>
      </div>

      {allContainers.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Box className="h-12 w-12 text-muted-foreground/40 mb-4" />
            <p className="text-muted-foreground">No containers found.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {allContainers.map((container) => (
            <Link
              key={container.containerId}
              href={`/dashboard/tags?accountId=${container.accountId}&containerId=${container.containerId}&name=${encodeURIComponent(container.name)}`}
            >
              <Card className="h-full hover:shadow-md hover:border-primary/30 transition-all cursor-pointer">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                      {container.usageContext?.includes("server") ? (
                        <Server className="h-5 w-5 text-primary" />
                      ) : (
                        <Globe className="h-5 w-5 text-primary" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-base truncate">{container.name}</CardTitle>
                      <CardDescription className="truncate">{container.publicId}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Account: {container.accountName}</span>
                    <div className="flex gap-1">
                      {container.usageContext?.map((ctx: string) => (
                        <Badge key={ctx} variant="default" className="text-xs">
                          {ctx === "web" ? "Web" : ctx === "server" ? "Server" : ctx}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  {container.domainName && container.domainName.length > 0 && (
                    <p className="text-xs text-muted-foreground mt-2">
                      {container.domainName.join(", ")}
                    </p>
                  )}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
