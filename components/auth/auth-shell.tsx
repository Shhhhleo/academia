import Link from "next/link"
import type { ReactNode } from "react"
import { Logo } from "@/components/brand/logo"
import { ShaderBackground } from "@/components/shader-background"

export function AuthShell({
  title,
  description,
  children,
  footer,
}: {
  title: string
  description: string
  children: ReactNode
  footer?: ReactNode
}) {
  return (
    <div className="relative isolate flex min-h-dvh flex-col">
      <ShaderBackground />
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-5 sm:px-6">
        <Link href="/" className="rounded-md focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none" aria-label="Academia home">
          <Logo />
        </Link>
      </header>
      <main id="main" className="flex flex-1 items-center justify-center px-4 pb-16 sm:px-6">
        <div className="w-full max-w-[400px]">
          <div className="rounded-[var(--radius-card)] border bg-card/85 p-6 shadow-[0_8px_40px_-12px_rgb(23_23_23/0.18)] backdrop-blur-xl sm:p-8 dark:bg-card/80">
            <div className="mb-6 space-y-1.5">
              <h1 className="text-2xl font-bold">{title}</h1>
              <p className="text-sm text-muted-foreground">{description}</p>
            </div>
            {children}
          </div>
          {footer && <div className="mt-6 text-center text-sm text-muted-foreground">{footer}</div>}
        </div>
      </main>
      <footer className="px-4 pb-6 text-center text-xs text-muted-foreground">
        <Link href="/privacy" className="hover:text-foreground">Privacy</Link>
        <span aria-hidden="true" className="mx-2">·</span>
        <Link href="/terms" className="hover:text-foreground">Terms</Link>
      </footer>
    </div>
  )
}
