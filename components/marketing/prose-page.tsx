import Link from "next/link"
import type { ReactNode } from "react"
import { ChevronRight } from "lucide-react"
import { SiteHeader } from "./site-header"

/** Shared shell for long-form public pages (guide, privacy, terms). */
export function ProsePage({
  title,
  intro,
  updated,
  crumb,
  children,
}: {
  title: string
  intro: ReactNode
  updated: string
  crumb: string
  children: ReactNode
}) {
  return (
    <>
      <SiteHeader />
      <main id="main" className="mx-auto max-w-3xl px-4 pt-28 pb-24 sm:px-6">
        <nav aria-label="Breadcrumb" className="mb-6 text-sm text-muted-foreground">
          <ol className="flex items-center gap-1">
            <li>
              <Link href="/" className="hover:text-foreground">
                Home
              </Link>
            </li>
            <li aria-hidden="true">
              <ChevronRight className="size-3.5" />
            </li>
            <li aria-current="page" className="text-foreground">
              {crumb}
            </li>
          </ol>
        </nav>
        <article>
          <header className="mb-10 border-b pb-8">
            <h1 className="text-[clamp(2rem,5vw,3rem)] leading-[1.05] font-extrabold">{title}</h1>
            <div className="mt-4 text-lg text-muted-foreground">{intro}</div>
            <p className="mt-4 text-xs text-muted-foreground">
              Last updated <time dateTime={updated}>{new Date(updated).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}</time>
            </p>
          </header>
          <div className="prose-academia">{children}</div>
        </article>
      </main>
    </>
  )
}
