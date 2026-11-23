import type { ReactNode } from "react"
import Link from "next/link"
import { Wrench } from "lucide-react"
import { buttonVariants } from "@/components/ui/button"
import { UNDER_MAINTENANCE } from "@/lib/maintenance"

/** Blurs a feature's page behind an "Under maintenance" pop-up while it is listed in UNDER_MAINTENANCE. */
export function MaintenanceGate({ feature, preview = false, children }: { feature: string; preview?: boolean; children: ReactNode }) {
  const note = UNDER_MAINTENANCE[feature]
  if (!note || preview) return <>{children}</>
  return (
    <div className="relative">
      <div inert aria-hidden="true" className="pointer-events-none max-h-[70vh] overflow-hidden blur-sm select-none">
        {children}
      </div>
      <div className="absolute inset-0 grid place-items-start justify-items-center bg-background/40 px-4 pt-[12vh]">
        <div
          role="alertdialog"
          aria-labelledby="maintenance-title"
          aria-describedby="maintenance-note"
          className="grid w-full max-w-sm justify-items-center gap-3 rounded-xl border bg-card p-6 text-center text-card-foreground shadow-lg"
        >
          <span className="grid size-12 place-items-center rounded-full bg-primary/10 text-primary">
            <Wrench className="size-5" aria-hidden="true" />
          </span>
          <h2 id="maintenance-title" className="text-lg font-semibold">
            Under maintenance
          </h2>
          <p id="maintenance-note" className="text-sm text-muted-foreground">
            {note}
          </p>
          <Link href="/dashboard" className={buttonVariants({ className: "mt-1 h-11 w-full" })}>
            Back to dashboard
          </Link>
        </div>
      </div>
    </div>
  )
}
