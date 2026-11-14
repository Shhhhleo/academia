import { ArrowDownRight, ArrowRight, ArrowUpRight } from "lucide-react"
import { cn } from "@/lib/utils"

/** Trend arrow + text + colour, so the meaning never relies on colour alone. */
export function Trend({
  delta,
  direction,
  className,
  compact,
}: {
  delta: number
  direction: "up" | "down" | "flat"
  className?: string
  compact?: boolean
}) {
  const Icon = direction === "up" ? ArrowUpRight : direction === "down" ? ArrowDownRight : ArrowRight
  const label =
    direction === "flat" ? "No change" : `${direction === "up" ? "Up" : "Down"} ${Math.abs(delta)} since last task`
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-xs font-medium",
        direction === "up" && "text-success-text",
        direction === "down" && "text-decline-text",
        direction === "flat" && "text-muted-foreground",
        className,
      )}
    >
      <Icon className="size-3.5" aria-hidden="true" />
      {compact ? (
        <>
          <span className="font-mono tabular">{direction === "flat" ? "±0" : `${delta > 0 ? "+" : ""}${delta}`}</span>
          <span className="sr-only">{label}</span>
        </>
      ) : (
        label
      )}
    </span>
  )
}
