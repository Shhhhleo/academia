import Link from "next/link"
import { differenceInCalendarDays, format, parseISO } from "date-fns"
import { CalendarClock, ClipboardList } from "lucide-react"
import { resultTextServer } from "./result-text"
import type { UpcomingItem } from "@/lib/data/insights"
import { KIND_LABEL } from "@/lib/data/schemas"
import type { Assessment, SubjectWithGrade } from "@/lib/data/types"

export function RecentAssessments({ subjects }: { subjects: SubjectWithGrade[] }) {
  const rows = subjects
    .flatMap((s) => s.assessments.filter((a) => a.status === "graded").map((a) => ({ a, s })))
    .sort((x, y) => (x.a.due_on < y.a.due_on ? 1 : x.a.due_on > y.a.due_on ? -1 : 0))
    .slice(0, 6)
  if (rows.length === 0) return <p className="py-6 text-center text-sm text-muted-foreground">Graded tasks you add appear here.</p>
  return (
    <ul className="-my-2 divide-y">
      {rows.map(({ a, s }) => (
        <li key={a.id}>
          <Link href={`/subjects/${s.id}#assessment-${a.id}`} className="flex items-center gap-3 py-2.5 hover:opacity-80 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none">
            <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: s.color }} aria-hidden="true" />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium">{a.title}</span>
              <span className="block truncate text-xs text-muted-foreground">
                {s.name} · {KIND_LABEL[a.kind]} · {format(parseISO(a.due_on), "d MMM")}
              </span>
            </span>
            <span className="shrink-0 font-mono text-xs tabular">{resultTextServer(a as Assessment, s.programme)}</span>
          </Link>
        </li>
      ))}
    </ul>
  )
}

export function UpcomingList({ items, today }: { items: UpcomingItem[]; today: string }) {
  if (items.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-muted-foreground">
        Nothing due. Add upcoming tasks, or{" "}
        <Link href="/integrations/managebac" className="font-medium text-primary hover:underline">
          connect ManageBac
        </Link>{" "}
        to pull in deadlines.
      </p>
    )
  }
  return (
    <ul className="-my-2 divide-y">
      {items.map((it) => {
        const days = differenceInCalendarDays(parseISO(it.date), parseISO(today))
        const when = days === 0 ? "Today" : days === 1 ? "Tomorrow" : days < 7 ? `In ${days} days` : format(parseISO(it.date), "EEE d MMM")
        return (
          <li key={it.key}>
            <Link href={it.href} className="flex items-center gap-3 py-2.5 hover:opacity-80 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none">
              <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground">
                {it.kind === "event" ? <CalendarClock className="size-4" aria-hidden="true" /> : <ClipboardList className="size-4" aria-hidden="true" />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">{it.title}</span>
                <span className="block truncate text-xs text-muted-foreground">
                  {it.subjectName ?? (it.eventKind ? it.eventKind[0].toUpperCase() + it.eventKind.slice(1) : "Event")}
                </span>
              </span>
              <span className={days <= 2 ? "shrink-0 text-xs font-medium text-warning-text" : "shrink-0 text-xs text-muted-foreground"}>{when}</span>
            </Link>
          </li>
        )
      })}
    </ul>
  )
}
