"use client"

import { addDays, format, startOfWeek } from "date-fns"
import { useMinuteClock } from "@/hooks/use-mounted"
import { cn } from "@/lib/utils"
import { ItemChip } from "./item-chip"
import type { CalItem } from "./items"

const START_HOUR = 7
const END_HOUR = 22
const HOUR_PX = 48

/** 7-day time grid with an all-day row and a live "now" line. */
export function WeekGrid({
  anchor,
  items,
  weekStartsOn,
  today,
  onCreate,
  onOpen,
}: {
  anchor: Date
  items: CalItem[]
  weekStartsOn: 0 | 1
  today: string
  onCreate: (iso: string) => void
  onOpen: (item: CalItem) => void
}) {
  const days = Array.from({ length: 7 }, (_, i) => addDays(startOfWeek(anchor, { weekStartsOn }), i))
  const minute = useMinuteClock()
  const now = minute == null ? null : new Date(minute * 60_000)

  const hours = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => START_HOUR + i)
  const nowTop = now ? (now.getHours() + now.getMinutes() / 60 - START_HOUR) * HOUR_PX : -1

  return (
    <div className="overflow-hidden rounded-[var(--radius-card)] border bg-card shadow-card">
      <div className="overflow-x-auto">
        <div className="min-w-[720px]">
          <div className="grid grid-cols-[3.5rem_repeat(7,1fr)] border-b bg-surface-2/60">
            <div />
            {days.map((d) => {
              const iso = format(d, "yyyy-MM-dd")
              return (
                <button
                  key={iso}
                  type="button"
                  onClick={() => onCreate(iso)}
                  className="px-2 py-2 text-center hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                  aria-label={`Add event on ${format(d, "EEEE d MMMM")}`}
                >
                  <span className="block text-xs text-muted-foreground">{format(d, "EEE")}</span>
                  <span className={cn("mx-auto mt-0.5 grid size-7 place-items-center rounded-full font-mono text-sm tabular", iso === today && "bg-primary font-semibold text-primary-foreground")}>
                    {format(d, "d")}
                  </span>
                </button>
              )
            })}
          </div>

          <div className="grid grid-cols-[3.5rem_repeat(7,1fr)] border-b">
            <div className="py-1.5 pr-2 text-right text-[10px] text-muted-foreground">All day</div>
            {days.map((d) => {
              const iso = format(d, "yyyy-MM-dd")
              return (
                <ul key={iso} className="min-h-9 space-y-0.5 border-l p-1">
                  {items
                    .filter((i) => i.allDay && i.date === iso)
                    .map((i) => (
                      <li key={i.key}>
                        <ItemChip item={i} onOpen={onOpen} />
                      </li>
                    ))}
                </ul>
              )
            })}
          </div>

          <div className="relative grid max-h-[560px] grid-cols-[3.5rem_repeat(7,1fr)] overflow-y-auto">
            <div>
              {hours.map((h) => (
                <div key={h} style={{ height: HOUR_PX }} className="pr-2 text-right font-mono text-[10px] text-muted-foreground tabular">
                  {String(h).padStart(2, "0")}:00
                </div>
              ))}
            </div>
            {days.map((d) => {
              const iso = format(d, "yyyy-MM-dd")
              const timed = items.filter((i) => !i.allDay && i.date === iso && i.start)
              return (
                <div key={iso} className="relative border-l" style={{ height: hours.length * HOUR_PX }}>
                  {hours.map((h) => (
                    <div key={h} className="border-b border-dashed border-border/70" style={{ height: HOUR_PX }} />
                  ))}
                  {timed.map((it, idx) => {
                    const s = it.start!
                    const e = it.end ?? new Date(s.getTime() + 60 * 60_000)
                    const top = Math.max(0, (s.getHours() + s.getMinutes() / 60 - START_HOUR) * HOUR_PX)
                    const height = Math.max(22, ((e.getTime() - s.getTime()) / 3_600_000) * HOUR_PX - 2)
                    return (
                      <div key={it.key} className="absolute right-1 left-1" style={{ top, height, marginLeft: idx * 6 }}>
                        <div className="h-full overflow-hidden rounded-md">
                          <ItemChip item={it} onOpen={onOpen} />
                        </div>
                      </div>
                    )
                  })}
                  {iso === today && nowTop >= 0 && nowTop <= hours.length * HOUR_PX && (
                    <div className="pointer-events-none absolute right-0 left-0 z-10 h-0.5 bg-decline" style={{ top: nowTop }} aria-hidden="true">
                      <span className="absolute -top-1 -left-1 size-2.5 rounded-full bg-decline" />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
