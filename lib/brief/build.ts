import { format, parseISO } from "date-fns"
import { addDays, formatMinutes, localDay } from "@/lib/study/streak"

export interface BriefInput {
  today: string
  days: number
  timezone: string
  subjects: {
    id: string
    name: string
    color: string
    grade: number | null
    target: number | null
    assessments: { id: string; title: string; due_on: string; status: string; kind: string }[]
  }[]
  events: { id: string; title: string; all_day: boolean; starts_on: string | null; starts_at: string | null }[]
  todos: { id: string; title: string; due_on: string | null; subject_id: string | null }[]
  reminders: { id: string; title: string; remind_at: string }[]
  study: { todayMinutes: number; goalMinutes: number; streak: number; atRisk: boolean }
}

export type BriefItemKind = "assessment" | "event" | "todo" | "reminder"

export interface BriefItem {
  key: string
  date: string
  kind: BriefItemKind
  title: string
  subtitle: string | null
  time: string | null
  color: string | null
  href: string
}

export interface BriefDay {
  date: string
  label: string
  items: BriefItem[]
}

const ORDER: Record<BriefItemKind, number> = { assessment: 0, event: 1, todo: 2, reminder: 3 }

function timeIn(iso: string, timeZone: string) {
  try {
    return new Intl.DateTimeFormat("en-GB", { timeZone, hour: "2-digit", minute: "2-digit" }).format(new Date(iso))
  } catch {
    return new Date(iso).toISOString().slice(11, 16)
  }
}

export function dayLabel(date: string, today: string) {
  if (date === today) return "Today"
  if (date === addDays(today, 1)) return "Tomorrow"
  return format(parseISO(date), "EEE d MMM")
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`
const when = (date: string, today: string) => {
  const l = dayLabel(date, today)
  return l === "Today" || l === "Tomorrow" ? l.toLowerCase() : `on ${l}`
}

/** Everything due in the next `days` days, grouped by day, plus a plain-language explanation. */
export function buildBrief(input: BriefInput) {
  const { today, timezone } = input
  const last = addDays(today, input.days - 1)
  const inWindow = (d: string | null | undefined) => Boolean(d && d >= today && d <= last)
  const subjectById = new Map(input.subjects.map((s) => [s.id, s]))

  const items: BriefItem[] = []
  for (const s of input.subjects) {
    for (const a of s.assessments) {
      if (a.status !== "upcoming" || !inWindow(a.due_on)) continue
      items.push({ key: `a-${a.id}`, kind: "assessment", date: a.due_on, title: a.title, subtitle: s.name, time: null, color: s.color, href: `/subjects/${s.id}#assessment-${a.id}` })
    }
  }
  for (const e of input.events) {
    const date = e.all_day ? e.starts_on : e.starts_at ? localDay(new Date(e.starts_at), timezone) : null
    if (!inWindow(date)) continue
    items.push({ key: `e-${e.id}`, kind: "event", date: date!, title: e.title, subtitle: null, time: !e.all_day && e.starts_at ? timeIn(e.starts_at, timezone) : null, color: null, href: `/calendar?date=${date}` })
  }
  for (const t of input.todos) {
    if (!inWindow(t.due_on)) continue
    const s = t.subject_id ? subjectById.get(t.subject_id) : undefined
    items.push({ key: `t-${t.id}`, kind: "todo", date: t.due_on!, title: t.title, subtitle: s?.name ?? null, time: null, color: s?.color ?? null, href: "/todos" })
  }
  for (const r of input.reminders) {
    const date = localDay(new Date(r.remind_at), timezone)
    if (!inWindow(date)) continue
    items.push({ key: `r-${r.id}`, kind: "reminder", date, title: r.title, subtitle: null, time: timeIn(r.remind_at, timezone), color: null, href: "/reminders" })
  }

  const days: BriefDay[] = Array.from({ length: input.days }, (_, i) => {
    const date = addDays(today, i)
    return {
      date,
      label: dayLabel(date, today),
      items: items
        .filter((x) => x.date === date)
        .sort((a, b) => ORDER[a.kind] - ORDER[b.kind] || (a.time ?? "").localeCompare(b.time ?? "")),
    }
  })

  const overdue = input.todos.filter((t) => t.due_on && t.due_on < today)

  // Focus: the subject furthest below target that has an assessment inside the window.
  const candidates = input.subjects
    .map((s) => {
      const next = s.assessments.filter((a) => a.status === "upcoming" && inWindow(a.due_on)).sort((a, b) => a.due_on.localeCompare(b.due_on))[0]
      const gap = s.grade != null && s.target != null ? s.target - s.grade : 0
      return { s, next, gap }
    })
    .filter((c) => c.next && c.gap > 0)
    .sort((a, b) => b.gap - a.gap || a.next!.due_on.localeCompare(b.next!.due_on))
  const focus = candidates[0]
    ? {
        subjectId: candidates[0].s.id,
        subjectName: candidates[0].s.name,
        gap: candidates[0].gap,
        target: candidates[0].s.target!,
        assessmentTitle: candidates[0].next!.title,
        due: candidates[0].next!.due_on,
      }
    : null

  const assessments = items.filter((i) => i.kind === "assessment").sort((a, b) => a.date.localeCompare(b.date))
  const todosDue = items.filter((i) => i.kind === "todo")
  const summary: string[] = []

  if (items.length === 0 && overdue.length === 0) {
    summary.push(`Nothing is due in the next ${plural(input.days, "day")}. A good time to get ahead on revision.`)
  } else if (assessments.length) {
    const list = assessments.map((a) => `${a.title} (${a.subtitle}) ${when(a.date, today)}`)
    const joined = list.length > 1 ? `${list.slice(0, -1).join(", ")} and ${list[list.length - 1]}` : list[0]
    summary.push(`You have ${plural(assessments.length, "assessment")} in the next ${plural(input.days, "day")}: ${joined}.`)
  } else {
    summary.push(`No assessments in the next ${plural(input.days, "day")}.`)
  }

  if (focus) {
    summary.push(
      `${focus.subjectName} is ${focus.gap} below your target of ${focus.target}, so give it extra time before ${focus.assessmentTitle} ${when(focus.due, today)}.`,
    )
  }

  if (todosDue.length || overdue.length) {
    const parts = [todosDue.length ? `${plural(todosDue.length, "to-do")} due in this window` : null, overdue.length ? `${overdue.length} overdue` : null].filter(Boolean)
    summary.push(`${parts.join(", plus ")}.`.replace(/^./, (c) => c.toUpperCase()))
  }

  const { todayMinutes, goalMinutes, streak } = input.study
  if (todayMinutes < goalMinutes) {
    summary.push(
      `Study ${formatMinutes(goalMinutes - todayMinutes)} more today to reach your ${formatMinutes(goalMinutes)} goal${streak > 0 ? ` and keep your ${streak}-day streak alive` : ""}.`,
    )
  } else {
    summary.push(`You’ve hit today’s study goal${streak > 0 ? `: that’s a ${streak}-day streak` : ""}.`)
  }

  return { today, days, overdue, focus, summary }
}

export type Brief = ReturnType<typeof buildBrief>
