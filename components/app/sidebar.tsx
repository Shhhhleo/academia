"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { PanelLeftClose, PanelLeftOpen } from "lucide-react"
import { Logo, LogoMark } from "@/components/brand/logo"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { NAV_SECTIONS, SETTINGS_ITEM, type NavItem } from "@/lib/nav"
import { cn } from "@/lib/utils"
import { useShell } from "./shell-context"

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`)
}

function NavLink({ item, collapsed, onNavigate }: { item: NavItem; collapsed: boolean; onNavigate?: () => void }) {
  const pathname = usePathname()
  const active = isActive(pathname, item.href)
  const link = (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group flex h-9 items-center gap-2.5 rounded-lg px-2.5 text-sm font-medium text-sidebar-foreground/75 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground focus-visible:ring-2 focus-visible:ring-sidebar-ring focus-visible:outline-none",
        active && "bg-sidebar-accent text-sidebar-foreground",
        collapsed && "justify-center px-0",
      )}
    >
      <item.icon
        className={cn("size-4 shrink-0", active ? "text-primary" : "text-sidebar-foreground/60 group-hover:text-sidebar-foreground")}
        aria-hidden="true"
      />
      {collapsed ? <span className="sr-only">{item.label}</span> : <span className="truncate">{item.label}</span>}
    </Link>
  )
  if (!collapsed) return link
  return (
    <Tooltip>
      <TooltipTrigger render={link} />
      <TooltipContent side="right">{item.label}</TooltipContent>
    </Tooltip>
  )
}

export function SidebarNav({
  collapsed = false,
  onToggle,
  onNavigate,
}: {
  collapsed?: boolean
  onToggle?: () => void
  onNavigate?: () => void
}) {
  const { subjects } = useShell()
  const pathname = usePathname()

  return (
    <div className="flex h-full flex-col">
      <div className={cn("flex h-14 items-center gap-2 px-3", collapsed && "justify-center px-0")}>
        <Link
          href="/dashboard"
          onClick={onNavigate}
          className="rounded-md focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          aria-label="Academia dashboard"
        >
          {collapsed ? <LogoMark /> : <Logo />}
        </Link>
        {onToggle && !collapsed && (
          <button
            type="button"
            onClick={onToggle}
            className="ml-auto grid size-8 place-items-center rounded-md text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            aria-label="Collapse sidebar"
          >
            <PanelLeftClose className="size-4" aria-hidden="true" />
          </button>
        )}
      </div>

      <nav aria-label="Main" className="flex-1 space-y-5 overflow-y-auto px-2 pb-4">
        {NAV_SECTIONS.map((section) => (
          <div key={section.label}>
            {!collapsed && (
              <p className="mb-1 px-2.5 text-[11px] font-medium tracking-wide text-sidebar-foreground/50">{section.label}</p>
            )}
            <ul className="space-y-0.5">
              {section.items.map((item) => (
                <li key={item.href}>
                  <NavLink item={item} collapsed={collapsed} onNavigate={onNavigate} />
                </li>
              ))}
            </ul>
          </div>
        ))}

        {!collapsed && subjects.length > 0 && (
          <div>
            <p className="mb-1 px-2.5 text-[11px] font-medium tracking-wide text-sidebar-foreground/50">Subjects</p>
            <ul className="space-y-0.5">
              {subjects.map((s) => {
                const href = `/subjects/${s.id}`
                const active = pathname === href
                return (
                  <li key={s.id}>
                    <Link
                      href={href}
                      onClick={onNavigate}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "flex h-8 items-center gap-2.5 rounded-lg px-2.5 text-sm text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-sidebar-foreground focus-visible:ring-2 focus-visible:ring-sidebar-ring focus-visible:outline-none",
                        active && "bg-sidebar-accent text-sidebar-foreground",
                      )}
                    >
                      <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: s.color }} aria-hidden="true" />
                      <span className="flex-1 truncate">{s.name}</span>
                      <span className="font-mono text-xs tabular text-sidebar-foreground/60">{s.effectiveGrade ?? "–"}</span>
                    </Link>
                  </li>
                )
              })}
            </ul>
          </div>
        )}
      </nav>

      <div className="space-y-0.5 border-t border-sidebar-border p-2">
        <NavLink item={SETTINGS_ITEM} collapsed={collapsed} onNavigate={onNavigate} />
        {onToggle && collapsed && (
          <button
            type="button"
            onClick={onToggle}
            className="flex h-9 w-full items-center justify-center rounded-lg text-sidebar-foreground/60 hover:bg-sidebar-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            aria-label="Expand sidebar"
          >
            <PanelLeftOpen className="size-4" aria-hidden="true" />
          </button>
        )}
      </div>
    </div>
  )
}
