"use client"

import { format } from "date-fns"
import { CircleCheck, Link2 } from "lucide-react"
import { cn } from "@/lib/utils"
import type { CalItem } from "./items"

export function ItemChip({ item, onOpen, compact }: { item: CalItem; onOpen: (i: CalItem) => void; compact?: boolean }) {
  const color = item.color ?? "var(--muted-foreground)"
  return (
    <button
      type="button"
      tabIndex={compact ? -1 : 0}
      onClick={(e) => {
        e.stopPropagation()
        onOpen(item)
      }}
      className={cn(
        "flex w-full items-center gap-1.5 rounded-md px-1.5 py-0.5 text-left text-[11px] leading-5 transition-colors hover:brightness-95 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
        item.status === "graded" && "opacity-70",
      )}
      style={{ backgroundColor: `color-mix(in oklab, ${color} 14%, var(--card))` }}
      title={item.title}
    >
      <span className="h-3 w-0.5 shrink-0 rounded-full" style={{ backgroundColor: color }} aria-hidden="true" />
      {!item.allDay && item.start && <span className="shrink-0 font-mono tabular text-muted-foreground">{format(item.start, "HH:mm")}</span>}
      <span className={cn("truncate font-medium text-foreground", item.status === "graded" && "line-through decoration-muted-foreground/50")}>{item.title}</span>
      {item.source === "managebac" && <Link2 className="ml-auto size-3 shrink-0 text-muted-foreground" aria-label="From ManageBac" />}
      {item.status === "graded" && <CircleCheck className="ml-auto size-3 shrink-0 text-muted-foreground" aria-label="Graded" />}
    </button>
  )
}
