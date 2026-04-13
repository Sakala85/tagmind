"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useSession, signOut } from "next-auth/react"
import {
  LayoutDashboard,
  Box,
  Tags,
  ClipboardCheck,
  Bot,
  FileBox,
  LogOut,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Logo } from "@/components/ui/logo"
import { useState } from "react"

const navigation = [
  { name: "Dashboard",   href: "/dashboard",            icon: LayoutDashboard },
  { name: "Containers",  href: "/dashboard/containers", icon: Box },
  { name: "Tags",        href: "/dashboard/tags",       icon: Tags },
  { name: "Audit",       href: "/dashboard/audit",      icon: ClipboardCheck },
  { name: "Templates",   href: "/dashboard/templates",  icon: FileBox },
  { name: "Agent IA",    href: "/dashboard/agent",      icon: Bot },
]

export function Sidebar() {
  const pathname = usePathname()
  const { data: session } = useSession()
  const [collapsed, setCollapsed] = useState(false)

  return (
    <aside
      className={cn(
        "flex flex-col border-r border-border bg-white transition-all duration-300",
        collapsed ? "w-[64px]" : "w-56"
      )}
    >
      {/* Logo */}
      <div className={cn("flex h-14 items-center px-4", collapsed && "justify-center px-0")}>
        {collapsed ? (
          <Logo size={30} showText={false} dark={false} />
        ) : (
          <Logo size={30} dark={false} />
        )}
      </div>

      <div className="mx-3 h-px bg-border" />

      {/* Navigation */}
      <nav className="flex-1 space-y-0.5 p-2 pt-3">
        {navigation.map((item) => {
          const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href))
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-150",
                isActive
                  ? "bg-primary/8 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
                collapsed && "justify-center px-0"
              )}
              title={collapsed ? item.name : undefined}
            >
              <item.icon className={cn("h-4 w-4 shrink-0", isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground")} />
              {!collapsed && <span>{item.name}</span>}
            </Link>
          )
        })}
      </nav>

      <div className="mx-3 h-px bg-border" />

      {/* User section */}
      <div className="p-2 pb-1">
        {session?.user && (
          <div className={cn(
            "flex items-center gap-2.5 rounded-lg px-3 py-2",
            collapsed && "justify-center px-0"
          )}>
            {session.user.image ? (
              <img
                src={session.user.image}
                alt={session.user.name || ""}
                className="h-7 w-7 shrink-0 rounded-full"
              />
            ) : (
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-semibold">
                {session.user.name?.[0]?.toUpperCase() || "U"}
              </div>
            )}
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-foreground truncate">
                  {session.user.name}
                </p>
                <p className="text-[10px] text-muted-foreground truncate">
                  {session.user.email}
                </p>
              </div>
            )}
          </div>
        )}

        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "w-full mt-1 text-muted-foreground hover:text-red-600 hover:bg-red-50 transition-colors text-xs",
            collapsed && "px-0"
          )}
          onClick={() => signOut({ callbackUrl: "/login" })}
        >
          <LogOut className="h-4 w-4 shrink-0" />
          {!collapsed && <span className="ml-2">Déconnexion</span>}
        </Button>
      </div>

      {/* Collapse toggle */}
      <div className="border-t border-border p-2">
        <Button
          variant="ghost"
          size="icon"
          className="w-full h-7 text-muted-foreground hover:text-foreground hover:bg-muted"
          onClick={() => setCollapsed(!collapsed)}
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </Button>
      </div>
    </aside>
  )
}
