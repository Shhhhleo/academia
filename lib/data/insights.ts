import type { HistoryPoint } from "@/lib/grades"

type SubjectLike = {
  id: string
  name: string
  color: string
  history: HistoryPoint[]
  assessments: { id: string; title: string; due_on: string; status: string; external_uid: string | null }[]
}

type EventLike = {
  id: string
  title: string
  starts_on: string | null
  starts_at: string | null
  all_day: boolean
  subject_id: string | null
  external_uid: string | null
  kind: string
}

/** Average of every subject's most recent grade, evaluated on each date any grade changed. */
export function averageTimeline(subjects: Pick<SubjectLike, "id" | "history">[]) {
  const dates = [...new Set(subjects.flatMap((s) => s.history.map((h) => h.date)))].sort()
  return dates.map((date) => {
    const latest = subjects
      .map((s) => s.history.filter((h) => h.date <= date).at(-1)?.grade)
      .filter((g): g is number => g != null)
    return {
      date,
      average: Math.round((latest.reduce((a, b) => a + b, 0) / latest.length) * 100) / 100,
      subjects: latest.length,
    }
  })
}

export interface UpcomingItem {
  key: string
  kind: "assessment" | "event"
  title: string
  date: string
  time: string | null
  subjectName: string | null
  color: string | null
  href: string
  eventKind?: string
}

/** Upcoming assessments and calendar events from `today` on, soonest first; ManageBac duplicates collapse to the assessment. */
export function upcomingItems(subjects: SubjectLike[], events: EventLike[], today: string, limit = 8): UpcomingItem[] {
  const items: UpcomingItem[] = []
  const seen = new Set<string>()
  for (const s of subjects) {
    for (const a of s.assessments) {
      if (a.status !== "upcoming" || a.due_on < today) continue
      if (a.external_uid) seen.add(a.external_uid)
      items.push({
        key: `a-${a.id}`,
        kind: "assessment",
        title: a.title,
        date: a.due_on,
        time: null,
        subjectName: s.name,
        color: s.color,
        href: `/subjects/${s.id}#assessment-${a.id}`,
      })
    }
  }
  const byId = new Map(subjects.map((s) => [s.id, s]))
  for (const e of events) {
    const date = e.all_day ? e.starts_on : e.starts_at ? e.starts_at.slice(0, 10) : null
    if (!date || date < today) continue
    if (e.external_uid && seen.has(e.external_uid)) continue
    const s = e.subject_id ? byId.get(e.subject_id) : undefined
    items.push({
      key: `e-${e.id}`,
      kind: "event",
      title: e.title,
      date,
      time: e.all_day ? null : e.starts_at,
      subjectName: s?.name ?? null,
      color: s?.color ?? null,
      href: `/calendar?date=${date}`,
      eventKind: e.kind,
    })
  }
  return items.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0)).slice(0, limit)
}
