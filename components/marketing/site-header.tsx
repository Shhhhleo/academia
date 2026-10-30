"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { Menu, X } from "lucide-react"
import { Logo } from "@/components/brand/logo"
import { cn } from "@/lib/utils"

const LINKS = [
  { href: "/#try", label: "Try it" },
  { href: "/#features", label: "Features" },
  { href: "/#managebac", label: "ManageBac" },
  { href: "/guides/ib-grading", label: "IB grading guide" },
  { href: "/#faq", label: "FAQ" },
]

/** Transparent over the dark hero, solid once the page scrolls past it. */
export function SiteHeader({ overHero = false }: { overHero?: boolean }) {
  const [solid, setSolid] = useState(!overHero)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!overHero) return
    const onScroll = () => setSolid(window.scrollY > window.innerHeight - 72)
    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [overHero])

  const dark = !solid
  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-[background-color,border-color,color] duration-300",
        solid ? "border-b bg-background/85 text-foreground backdrop-blur-md" : "border-b border-transparent text-white",
      )}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-4 sm:px-6">
        <Link href="/" className="rounded-md focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none" aria-label="Academia home">
          <Logo />
        </Link>
        <nav aria-label="Primary" className="hidden flex-1 items-center gap-1 md:flex">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={cn(
                "rounded-md px-3 py-2 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                dark ? "text-white/75 hover:text-white" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <Link
            href="/login"
            className={cn("hidden rounded-lg px-3 py-2 text-sm font-medium sm:inline-flex", dark ? "text-white/85 hover:text-white" : "hover:bg-accent")}
          >
            Log in
          </Link>
          <Link
            href="/signup"
            className={cn(
              "inline-flex h-9 items-center rounded-lg px-3.5 text-sm font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none",
              dark ? "bg-white text-[#0b0c10] hover:bg-white/90" : "bg-primary text-primary-foreground hover:bg-primary/90",
            )}
          >
            Get started free
          </Link>
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            className={cn("grid size-9 place-items-center rounded-lg md:hidden", dark ? "text-white hover:bg-white/10" : "hover:bg-accent")}
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            aria-controls="mobile-nav"
          >
            {open ? <X className="size-5" aria-hidden="true" /> : <Menu className="size-5" aria-hidden="true" />}
          </button>
        </div>
      </div>
      {open && (
        <nav id="mobile-nav" aria-label="Mobile" className="border-t bg-background px-4 py-3 text-foreground md:hidden">
          <ul className="grid gap-1">
            {[...LINKS, { href: "/login", label: "Log in" }].map((l) => (
              <li key={l.href}>
                <Link href={l.href} onClick={() => setOpen(false)} className="block rounded-md px-3 py-2.5 text-sm font-medium hover:bg-accent">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </header>
  )
}
