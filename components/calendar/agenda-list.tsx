"use client"

import { format, parseISO } from "date-fns"
import { ItemChip } from "./item-chip"
import type { CalItem } from "./items"

export function AgendaList({ items, from, onOpen }: { items: CalItem[]; from: string; onOpen: (i: CalItem) => void }) {
  const upcoming = items.filter((i) => i.date >= from)
  const groups = new Map<string, CalItem[]>()
  for (const it of upcoming) groups.set(it.date, [...(groups.get(it.date) ?? []), it])
  if (groups.size === 0) {
    return <p className="rounded-[var(--radius-card)] border border-dashed py-14 text-center text-sm text-muted-foreground">Nothing scheduled in the next 60 days.</p>
  }
  return (
    <ol className="divide-y rounded-[var(--radius-card)] border bg-card shadow-card">
      {[...groups.entries()].map(([date, list]) => (
        <li key={date} className="grid gap-2 p-4 sm:grid-cols-[9rem_1fr]">
          <p className="text-sm">
            <span className="font-medium">{format(parseISO(date), "EEE d MMM")}</span>
          </p>
          <ul className="space-y-1">
            {list.map((it) => (
              <li key={it.key} className="flex items-center gap-2">
                <div className="min-w-0 flex-1">
                  <ItemChip item={it} onOpen={onOpen} />
                </div>
                <span className="hidden w-40 shrink-0 truncate text-xs text-muted-foreground sm:block">{it.subjectName ?? (it.source === "managebac" ? "ManageBac" : "Personal")}</span>
              </li>
            ))}
          </ul>
        </li>
      ))}
    </ol>
  )
}
