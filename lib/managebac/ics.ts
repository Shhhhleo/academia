import ICAL from "ical.js"

export interface IcsItem {
  uid: string
  title: string
  description: string | null
  allDay: boolean
  /** yyyy-mm-dd, only for all-day items (kept as a calendar date so it never shifts across timezones). */
  date?: string
  endDate?: string
  startsAt?: string
  endsAt?: string
}

const MAX_ITEMS = 2000
/** Upper bound on recurrence steps across the whole feed, so a daily series from 1990 can't stall a sync. */
const MAX_EXPANSION_STEPS = 50_000
/** `external_uid` is stored in 300 characters; occurrence keys keep room for their suffix. */
const MAX_UID = 300

export interface ParseWindow {
  /** Epoch ms; items starting before this are dropped. */
  from?: number
  /** Epoch ms, exclusive. When set, recurring series are expanded into one item per occurrence. */
  to?: number
}

const timeKey = (t: ICAL.Time) => (t.isDate ? t.toString().slice(0, 10) : t.toJSDate().toISOString())
const itemAt = (it: IcsItem) => (it.allDay ? Date.parse(`${it.date}T00:00:00Z`) : Date.parse(it.startsAt!))

function toItem(uid: string, ev: ICAL.Event, start: ICAL.Time, endTime: ICAL.Time | null): IcsItem | null {
  if (String(ev.component.getFirstPropertyValue("status") ?? "").toUpperCase() === "CANCELLED") return null
  const title = (ev.summary ?? "").toString().trim().slice(0, 200) || "Untitled"
  const description = ev.description ? ev.description.toString().trim().slice(0, 4000) : null
  if (start.isDate) {
    const end = endTime && endTime.isDate ? endTime.clone() : null
    if (end) end.adjust(-1, 0, 0, 0) // DTEND is exclusive for all-day events
    const date = start.toString().slice(0, 10)
    const endDate = end ? end.toString().slice(0, 10) : undefined
    return { uid, title, description, allDay: true, date, endDate: endDate && endDate > date ? endDate : undefined }
  }
  return { uid, title, description, allDay: false, startsAt: start.toJSDate().toISOString(), endsAt: endTime ? endTime.toJSDate().toISOString() : undefined }
}

/**
 * Parses an iCalendar feed into flat items keyed by a stable, unique `uid`.
 * With a `to` bound, recurring series are expanded into one item per occurrence
 * (keyed `uid#recurrence-id`), modified instances replace their occurrence and
 * cancelled ones are dropped. The window is applied before the size cap.
 */
export function parseIcs(text: string, window: ParseWindow = {}): IcsItem[] {
  let root: ICAL.Component
  try {
    root = new ICAL.Component(ICAL.parse(text))
  } catch {
    return []
  }
  if (root.name !== "vcalendar") return []

  for (const tz of root.getAllSubcomponents("vtimezone")) {
    try {
      ICAL.TimezoneService.register(tz)
    } catch {
      // An unparsable VTIMEZONE falls back to floating times.
    }
  }

  const series = new Map<string, ICAL.Event>()
  const exceptions: ICAL.Event[] = []
  for (const vevent of root.getAllSubcomponents("vevent")) {
    try {
      const ev = new ICAL.Event(vevent)
      const uid = String(ev.uid ?? "").trim()
      if (!uid || !ev.startDate) continue
      if (ev.isRecurrenceException()) exceptions.push(ev)
      else series.set(uid, ev)
    } catch {
      // Skip a malformed event rather than failing the whole feed.
    }
  }

  const expand = window.to !== undefined
  const occurrenceUid = (uid: string, rid: ICAL.Time) => `${uid.slice(0, MAX_UID - 30)}#${timeKey(rid)}`
  const inWindow = (it: IcsItem) => {
    const at = itemAt(it)
    return (window.from === undefined || at >= window.from) && (window.to === undefined || at < window.to)
  }
  const byUid = new Map<string, IcsItem>()
  const keep = (it: IcsItem | null) => {
    if (it && inWindow(it)) byUid.set(it.uid, it)
  }

  for (const ex of exceptions) {
    const parent = series.get(String(ex.uid).trim())
    if (expand && parent?.isRecurring()) {
      try {
        parent.relateException(ex)
        continue
      } catch {
        // Fall through and keep it as a standalone item.
      }
    }
    // Without expansion the series' own item stands for it; an orphan instance is kept on its own.
    if (expand || !parent) {
      try {
        keep(toItem(occurrenceUid(String(ex.uid).trim(), ex.recurrenceId), ex, ex.startDate, ex.endDate))
      } catch {
        // Malformed instance.
      }
    }
  }

  let steps = 0
  for (const [uid, ev] of series) {
    try {
      if (!expand || !ev.isRecurring()) {
        keep(toItem(uid.slice(0, MAX_UID), ev, ev.startDate, ev.endDate))
        continue
      }
      const it = ev.iterator()
      for (let next = it.next(); next && steps < MAX_EXPANSION_STEPS; next = it.next(), steps++) {
        const d = ev.getOccurrenceDetails(next)
        if (d.startDate.toJSDate().getTime() >= window.to! && next.toJSDate().getTime() >= window.to!) break
        keep(toItem(occurrenceUid(uid, d.recurrenceId), d.item, d.startDate, d.endDate))
      }
    } catch {
      // Skip a malformed series rather than failing the whole feed.
    }
  }

  // Over the cap, the oldest items go first: upcoming deadlines matter most.
  return [...byUid.values()].sort((a, b) => itemAt(a) - itemAt(b)).slice(-MAX_ITEMS)
}

const norm = (s: string) =>
  ` ${s
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()} `

/** Picks the subject whose ManageBac class name (or name) appears in the title; the longest match wins. */
export function matchSubject(title: string, subjects: { id: string; name: string; managebacMatch: string | null }[]): string | null {
  const t = norm(title)
  let best: { id: string; len: number } | null = null
  for (const s of subjects) {
    for (const candidate of [s.managebacMatch, s.name]) {
      if (!candidate) continue
      const c = norm(candidate)
      if (c.trim().length < 2) continue
      if (t.includes(c) && (!best || c.length > best.len)) best = { id: s.id, len: c.length }
    }
  }
  return best?.id ?? null
}

type AssessmentKind = "summative" | "exam" | "mock" | "ia" | "formative" | "other"

export function inferKind(title: string): { event: "deadline" | "exam" | "event"; assessment: AssessmentKind | null } {
  const t = title.toLowerCase()
  if (/\bmock\b/.test(t)) return { event: "exam", assessment: "mock" }
  if (/\bformative\b/.test(t)) return { event: /\b(quiz|test|exam)\b/.test(t) ? "exam" : "deadline", assessment: "formative" }
  if (/\b(exam|test|quiz|paper \d)\b/.test(t)) return { event: "exam", assessment: "exam" }
  if (/\bsummative\b/.test(t)) return { event: "deadline", assessment: "summative" }
  if (/\b(ia|internal assessment)\b/.test(t)) return { event: "deadline", assessment: "ia" }
  if (/\b(due|deadline|submission|assignment|task|report|essay|project)\b/.test(t)) return { event: "deadline", assessment: "other" }
  return { event: "event", assessment: null }
}
