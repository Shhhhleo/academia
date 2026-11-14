"use client"

import { addDays, format, isSameMonth, parseISO, startOfMonth, startOfWeek } from "date-fns"
import { useEffect, useRef } from "react"
import { cn } from "@/lib/utils"
import { ItemChip } from "./item-chip"
import type { CalItem } from "./items"

export function monthGridDays(anchor: Date, weekStartsOn: 0 | 1) {
  const start = startOfWeek(startOfMonth(anchor), { weekStartsOn })
  return Array.from({ length: 42 }, (_, i) => addDays(start, i))
}

/** 6×7 month grid. Arrow keys move between days, Enter adds an event, chips open details. */
export function MonthGrid({
  anchor,
  focused,
  onFocusDate,
  items,
  weekStartsOn,
  today,
  onCreate,
  onOpen,
  onMore,
}: {
  anchor: Date
  focused: string
  onFocusDate: (iso: string) => void
  items: CalItem[]
  weekStartsOn: 0 | 1
  today: string
  onCreate: (iso: string) => void
  onOpen: (item: CalItem) => void
  onMore: (iso: string) => void
}) {
  const days = monthGridDays(anchor, weekStartsOn)
  const byDay = new Map<string, CalItem[]>()
  for (const it of items) byDay.set(it.date, [...(byDay.get(it.date) ?? []), it])
  const gridRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = gridRef.current?.querySelector<HTMLElement>(`[data-date="${focused}"]`)
    if (el && gridRef.current?.contains(document.activeElement)) el.focus()
  }, [focused])

  const onKey = (e: React.KeyboardEvent, iso: string) => {
    const d = parseISO(iso)
    const move: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }
    if (e.key in move) {
      e.preventDefault()
      onFocusDate(format(addDays(d, move[e.key]), "yyyy-MM-dd"))
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault()
      onCreate(iso)
    }
  }

  return (
    <div ref={gridRef} role="grid" aria-label={format(anchor, "MMMM yyyy")} className="overflow-hidden rounded-[var(--radius-card)] border bg-card shadow-card">
      <div role="row" className="grid grid-cols-7 border-b bg-surface-2/60">
        {days.slice(0, 7).map((d) => (
          <div key={d.toISOString()} role="columnheader" className="px-2 py-2 text-center text-xs font-medium text-muted-foreground">
            <span className="hidden sm:inline">{format(d, "EEE")}</span>
            <span className="sm:hidden">{format(d, "EEEEE")}</span>
          </div>
        ))}
      </div>
      {Array.from({ length: 6 }, (_, w) => (
        <div key={w} role="row" className="grid grid-cols-7 divide-x border-b last:border-b-0">
          {days.slice(w * 7, w * 7 + 7).map((d) => {
            const iso = format(d, "yyyy-MM-dd")
            const list = byDay.get(iso) ?? []
            const inMonth = isSameMonth(d, anchor)
            const isToday = iso === today
            return (
              <div
                key={iso}
                role="gridcell"
                data-date={iso}
                tabIndex={iso === focused ? 0 : -1}
                aria-selected={iso === focused}
                aria-label={`${format(d, "EEEE d MMMM")}${list.length ? `, ${list.length} item${list.length === 1 ? "" : "s"}` : ""}`}
                onKeyDown={(e) => onKey(e, iso)}
                onFocus={() => iso !== focused && onFocusDate(iso)}
                onDoubleClick={() => onCreate(iso)}
                className={cn(
                  "min-h-24 p-1.5 outline-none focus-visible:bg-primary-soft sm:min-h-28",
                  !inMonth && "bg-surface-2/40",
                )}
              >
                <div className="mb-1 flex justify-end">
                  <span
                    className={cn(
                      "grid size-6 place-items-center rounded-full font-mono text-xs tabular",
                      isToday ? "bg-primary font-semibold text-primary-foreground" : inMonth ? "text-foreground" : "text-muted-foreground/60",
                    )}
                  >
                    {format(d, "d")}
                  </span>
                </div>
                <ul className="space-y-0.5">
                  {list.slice(0, 3).map((it) => (
                    <li key={it.key}>
                      <ItemChip item={it} onOpen={onOpen} compact />
                    </li>
                  ))}
                  {list.length > 3 && (
                    <li>
                      <button
                        type="button"
                        tabIndex={-1}
                        onClick={() => onMore(iso)}
                        className="w-full rounded px-1.5 text-left text-[11px] font-medium text-muted-foreground hover:bg-accent"
                      >
                        +{list.length - 3} more
                      </button>
                    </li>
                  )}
                </ul>
              </div>
            )
          })}
        </div>
      ))}
    </div>
  )
}
