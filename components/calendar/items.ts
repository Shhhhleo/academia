import { format } from "date-fns"
import type { Assessment, CalendarEvent } from "@/lib/data/types"

export type ItemSource = "assessment" | "managebac" | "google" | "manual"

export interface CalItem {
  key: string
  title: string
  /** Local calendar day yyyy-mm-dd */
  date: string
  allDay: boolean
  start?: Date
  end?: Date
  color: string | null
  subjectId: string | null
  subjectName: string | null
  source: ItemSource
  kind: string
  status?: "upcoming" | "graded"
  description?: string | null
  event?: CalendarEvent
  assessmentId?: string
}

type SubjectLike = {
  id: string
  name: string
  color: string
  assessments: Pick<Assessment, "id" | "title" | "due_on" | "status" | "kind" | "external_uid" | "source">[]
}

/** Assessments + calendar events as one list. A ManageBac event that is also an assessment shows once (as the assessment). */
export function buildItems(subjects: SubjectLike[], events: CalendarEvent[]): CalItem[] {
  const byId = new Map(subjects.map((s) => [s.id, s]))
  const assessmentUids = new Set(subjects.flatMap((s) => s.assessments.map((a) => a.external_uid).filter(Boolean)))

  const items: CalItem[] = subjects.flatMap((s) =>
    s.assessments.map<CalItem>((a) => ({
      key: `a-${a.id}`,
      title: a.title,
      date: a.due_on,
      allDay: true,
      color: s.color,
      subjectId: s.id,
      subjectName: s.name,
      source: "assessment",
      kind: a.kind,
      status: a.status,
      assessmentId: a.id,
    })),
  )

  for (const e of events) {
    if (e.external_uid && e.source === "managebac" && assessmentUids.has(e.external_uid)) continue
    const s = e.subject_id ? byId.get(e.subject_id) : undefined
    const start = !e.all_day && e.starts_at ? new Date(e.starts_at) : undefined
    const date = e.all_day ? e.starts_on : start ? format(start, "yyyy-MM-dd") : null
    if (!date) continue
    items.push({
      key: `e-${e.id}`,
      title: e.title,
      date,
      allDay: e.all_day,
      start,
      end: e.ends_at ? new Date(e.ends_at) : undefined,
      color: s?.color ?? null,
      subjectId: e.subject_id,
      subjectName: s?.name ?? null,
      source: e.source === "managebac" ? "managebac" : e.source === "google" ? "google" : "manual",
      kind: e.kind,
      description: e.description,
      event: e,
    })
  }
  return items.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : (a.start?.getTime() ?? 0) - (b.start?.getTime() ?? 0)))
}
