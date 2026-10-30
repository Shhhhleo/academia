"use client"

import { useEffect, useState, type ReactNode } from "react"
import { Menu, Search, X } from "lucide-react"
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet"
import { cn } from "@/lib/utils"
import { GlobalSearch } from "./global-search"
import { QuickAdd } from "./quick-add"
import { SidebarNav } from "./sidebar"
import { NotificationsButton, ThemeToggle, UserMenu, YearSelect } from "./topbar-controls"

const COLLAPSE_KEY = "academia:sidebar-collapsed"

export function AppShell({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileNav, setMobileNav] = useState(false)
  const [mobileSearch, setMobileSearch] = useState(false)

  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem(COLLAPSE_KEY) === "1")
    } catch {}
  }, [])

  const toggle = () =>
    setCollapsed((c) => {
      try {
        localStorage.setItem(COLLAPSE_KEY, c ? "0" : "1")
      } catch {}
      return !c
    })

  return (
    <div className="flex min-h-dvh">
      <a
        href="#main"
        className="sr-only z-50 rounded-md bg-primary px-3 py-2 text-primary-foreground focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Skip to content
      </a>

      <aside
        className={cn(
          "sticky top-0 hidden h-dvh shrink-0 border-r border-sidebar-border bg-sidebar transition-[width] duration-200 lg:block",
          collapsed ? "w-16" : "w-[248px]",
        )}
      >
        <SidebarNav collapsed={collapsed} onToggle={toggle} />
      </aside>

      <Sheet open={mobileNav} onOpenChange={setMobileNav}>
        <SheetContent side="left" className="w-[280px] bg-sidebar p-0">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <SheetDescription className="sr-only">Main navigation and subjects</SheetDescription>
          <SidebarNav onNavigate={() => setMobileNav(false)} />
        </SheetContent>
      </Sheet>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 border-b bg-background/85 backdrop-blur-md supports-[backdrop-filter]:bg-background/70">
          <div className="flex h-14 items-center gap-2 px-3 sm:px-5">
            <button
              type="button"
              onClick={() => setMobileNav(true)}
              className="grid size-9 place-items-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none lg:hidden"
              aria-label="Open navigation"
            >
              <Menu className="size-5" aria-hidden="true" />
            </button>
            <div className="hidden max-w-md flex-1 md:block">
              <GlobalSearch />
            </div>
            <div className="ml-auto flex items-center gap-1">
              <button
                type="button"
                onClick={() => setMobileSearch((s) => !s)}
                className="grid size-9 place-items-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none md:hidden"
                aria-label={mobileSearch ? "Close search" : "Search"}
                aria-expanded={mobileSearch}
              >
                {mobileSearch ? <X className="size-4" aria-hidden="true" /> : <Search className="size-4" aria-hidden="true" />}
              </button>
              <YearSelect className="hidden sm:block" />
              <NotificationsButton />
              <ThemeToggle />
              <div className="ml-1">
                <UserMenu />
              </div>
            </div>
          </div>
          {mobileSearch && (
            <div className="border-t px-3 py-2 md:hidden">
              <GlobalSearch autoFocus onNavigate={() => setMobileSearch(false)} />
            </div>
          )}
        </header>

        <main id="main" tabIndex={-1} className="flex-1 px-4 pt-6 pb-28 outline-none sm:px-6 lg:px-8">
          <div className="mx-auto w-full max-w-6xl">{children}</div>
        </main>
      </div>

      <QuickAdd />
    </div>
  )
}
