import { cn } from "@/lib/utils"

/** Academia mark: three ascending bars, a grade on the rise. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={cn("size-7", className)} aria-hidden="true">
      <rect width="32" height="32" rx="8" className="fill-primary" />
      <rect x="8" y="17" width="4" height="7" rx="1.5" className="fill-primary-foreground" opacity="0.55" />
      <rect x="14" y="12.5" width="4" height="11.5" rx="1.5" className="fill-primary-foreground" opacity="0.8" />
      <rect x="20" y="8" width="4" height="16" rx="1.5" className="fill-primary-foreground" />
    </svg>
  )
}

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <LogoMark />
      <span className="font-display text-[1.05rem] font-bold tracking-tight">Academia</span>
    </span>
  )
}
