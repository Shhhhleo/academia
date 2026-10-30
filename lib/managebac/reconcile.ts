import { localDay } from "@/lib/study/streak"
import type { IcsItem } from "./ics"

/** The calendar day an item falls on for someone in `timeZone` (all-day items keep their date). */
export function itemDay(it: IcsItem, timeZone: string): string {
  return it.allDay ? it.date! : localDay(new Date(it.startsAt!), timeZone)
}

/** Ids of synced rows that are no longer in the feed and fall on or after `fromDay`; older history is kept. */
export function staleIds<T extends { id: string; external_uid: string | null }>(
  rows: T[],
  feedUids: Set<string>,
  dayOf: (row: T) => string | null,
  fromDay: string,
): string[] {
  return rows
    .filter((r) => {
      if (!r.external_uid || feedUids.has(r.external_uid)) return false
      const day = dayOf(r)
      return day !== null && day >= fromDay
    })
    .map((r) => r.id)
}
