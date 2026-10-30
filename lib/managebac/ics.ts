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

export function parseIcs(text: string): IcsItem[] {
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

  const items: IcsItem[] = []
  for (const vevent of root.getAllSubcomponents("vevent").slice(0, MAX_ITEMS)) {
    try {
      const ev = new ICAL.Event(vevent)
      const uid = String(ev.uid ?? "").trim()
      const start = ev.startDate
      if (!uid || !start) continue
      const title = (ev.summary ?? "").toString().trim().slice(0, 200) || "Untitled"
      const description = ev.description ? ev.description.toString().trim().slice(0, 4000) : null
      if (start.isDate) {
        const end = ev.endDate && ev.endDate.isDate ? ev.endDate.clone() : null
        if (end) end.adjust(-1, 0, 0, 0) // DTEND is exclusive for all-day events
        const date = start.toString().slice(0, 10)
        const endDate = end ? end.toString().slice(0, 10) : undefined
        items.push({ uid, title, description, allDay: true, date, endDate: endDate && endDate > date ? endDate : undefined })
      } else {
        items.push({
          uid,
          title,
          description,
          allDay: false,
          startsAt: start.toJSDate().toISOString(),
          endsAt: ev.endDate ? ev.endDate.toJSDate().toISOString() : undefined,
        })
      }
    } catch {
      // Skip a malformed event rather than failing the whole feed.
    }
  }
  return items
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
