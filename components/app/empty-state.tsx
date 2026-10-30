import type { LucideIcon } from "lucide-react"
import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon: LucideIcon
  title: string
  description: ReactNode
  action?: ReactNode
  className?: string
}) {
  return (
    <div role="status" className={cn("flex flex-col items-center rounded-[var(--radius-card)] border border-dashed px-6 py-14 text-center", className)}>
      <span className="grid size-11 place-items-center rounded-xl bg-primary-soft text-primary">
        <Icon className="size-5" aria-hidden="true" />
      </span>
      <h2 className="mt-4 text-base font-semibold">{title}</h2>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}
