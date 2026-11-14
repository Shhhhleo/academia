import type { Metadata } from "next"
import Link from "next/link"
import { format, parseISO } from "date-fns"
import { AlarmClock, CalendarClock, ClipboardList, Crosshair, ListTodo, Settings2, Sparkles } from "lucide-react"
import { PageHeader, Panel } from "@/components/app/page-header"
import { buildBrief, type BriefItemKind } from "@/lib/brief/build"
import { getEvents, getReminders, getStudySessions, getTodos, getWorkspace } from "@/lib/data/queries"
import { addDays, computeStreak, dailyTotals, localDay } from "@/lib/study/streak"
import { cn } from "@/lib/utils"

export const metadata: Metadata = { title: "Daily Brief" }

const ICON: Record<BriefItemKind, typeof ClipboardList> = { assessment: ClipboardList, event: CalendarClock, todo: ListTodo, reminder: AlarmClock }
const KIND_LABEL: Record<BriefItemKind, string> = { assessment: "Assessment", event: "Event", todo: "To-do", reminder: "Reminder" }

function greeting(timeZone: string) {
  let hour = new Date().getUTCHours()
  try {
    hour = Number(new Intl.DateTimeFormat("en-GB", { timeZone, hour: "2-digit", hourCycle: "h23" }).format(new Date()))
  } catch {}
  return hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening"
}

export default async function BriefPage({ searchParams }: PageProps<"/brief">) {
  const sp = await searchParams
  const ws = await getWorkspace()
  const { profile } = ws
  const requested = Number(sp.days)
  const days = [1, 3, 5, 7].includes(requested) ? requested : profile.brief_days
  const today = localDay(new Date(), profile.timezone)

  // Timed events are stored in UTC, so pad a day each side; buildBrief keeps only the student's local days.
  const [events, todos, reminders, sessions] = await Promise.all([getEvents(addDays(today, -1), addDays(today, days + 1)), getTodos(), getReminders(), getStudySessions()])
  const streak = computeStreak(dailyTotals(sessions), profile.daily_study_goal_minutes, today)

  const brief = buildBrief({
    today,
    days,
    timezone: profile.timezone,
    subjects: ws.subjects.map((s) => ({ id: s.id, name: s.name, color: s.color, grade: s.effectiveGrade, target: s.target_grade, assessments: s.assessments })),
    events,
    todos: todos.filter((t) => !t.done_at),
    reminders: reminders.filter((r) => !r.done_at),
    study: { todayMinutes: streak.todayMinutes, goalMinutes: profile.daily_study_goal_minutes, streak: streak.current, atRisk: streak.atRisk },
  })

  return (
    <>
      <PageHeader
        eyebrow={format(parseISO(today), "EEEE d MMMM")}
        title={`${greeting(profile.timezone)}, ${profile.display_name.split(" ")[0]}`}
        description={`Your brief for the next ${days === 1 ? "day" : `${days} days`}.`}
        actions={
          <div className="flex items-center gap-2">
            <div className="inline-flex rounded-lg border bg-muted p-0.5" role="group" aria-label="Days to show">
              {[1, 3, 5, 7].map((d) => (
                <Link
                  key={d}
                  href={`/brief?days=${d}`}
                  aria-current={d === days ? "true" : undefined}
                  className={cn("rounded-md px-3 py-1 text-xs font-medium text-muted-foreground", d === days && "bg-card text-foreground shadow-sm")}
                >
                  {d}d
                </Link>
              ))}
            </div>
            <Link href="/reminders#brief-settings" className="inline-flex h-8 items-center gap-1.5 rounded-lg border px-3 text-sm font-medium hover:bg-accent">
              <Settings2 className="size-4" aria-hidden="true" /> Brief time
            </Link>
          </div>
        }
      />

      <section aria-label="Summary" className="mb-6 rounded-[var(--radius-card)] border bg-[linear-gradient(135deg,var(--primary-soft),var(--card)_55%)] p-6 shadow-card">
        <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-primary">
          <Sparkles className="size-4" aria-hidden="true" /> What’s ahead
        </p>
        <div className="max-w-3xl space-y-2 text-base leading-relaxed">
          {brief.summary.map((line) => (
            <p key={line}>{line}</p>
          ))}
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          {brief.days.map((d) => (
            <Panel key={d.date} title={d.label} description={d.label === "Today" || d.label === "Tomorrow" ? format(parseISO(d.date), "EEEE d MMMM") : undefined}>
              {d.items.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nothing scheduled.</p>
              ) : (
                <ul className="-my-1.5 divide-y">
                  {d.items.map((it) => {
                    const Icon = ICON[it.kind]
                    return (
                      <li key={it.key}>
                        <Link href={it.href} className="flex items-center gap-3 py-2.5 hover:opacity-80 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none">
                          <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground" style={it.color ? { color: it.color } : undefined}>
                            <Icon className="size-4" aria-hidden="true" />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-medium">{it.title}</span>
                            <span className="block truncate text-xs text-muted-foreground">
                              {KIND_LABEL[it.kind]}
                              {it.subtitle && ` · ${it.subtitle}`}
                            </span>
                          </span>
                          {it.time && <span className="font-mono text-xs text-muted-foreground tabular">{it.time}</span>}
                        </Link>
                      </li>
                    )
                  })}
                </ul>
              )}
            </Panel>
          ))}
        </div>

        <div className="space-y-4">
          {brief.focus && (
            <Panel title="Focus">
              <div className="flex gap-3">
                <Crosshair className="mt-0.5 size-5 shrink-0 text-warning-text" aria-hidden="true" />
                <p className="text-sm">
                  <Link href={`/subjects/${brief.focus.subjectId}`} className="font-semibold hover:underline">
                    {brief.focus.subjectName}
                  </Link>{" "}
                  is {brief.focus.gap} below target. Prepare for <strong>{brief.focus.assessmentTitle}</strong>, and check what you need with the{" "}
                  <Link href={`/calculator?subject=${brief.focus.subjectId}`} className="font-medium text-primary hover:underline">
                    grade calculator
                  </Link>
                  .
                </p>
              </div>
            </Panel>
          )}
          <Panel title="Overdue" description={brief.overdue.length ? undefined : "Nothing overdue."}>
            {brief.overdue.length > 0 && (
              <ul className="space-y-2 text-sm">
                {brief.overdue.map((t) => (
                  <li key={t.id}>
                    <Link href="/todos" className="flex justify-between gap-3 hover:underline">
                      <span className="truncate">{t.title}</span>
                      <span className="shrink-0 text-xs text-decline-text">{t.due_on && format(parseISO(t.due_on), "d MMM")}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
          <Panel title="Study today">
            <p className="text-sm">
              <span className="font-mono text-lg font-semibold tabular">{streak.todayMinutes}</span>
              <span className="text-muted-foreground"> of {profile.daily_study_goal_minutes} minutes</span>
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Streak: <span className="font-mono tabular text-foreground">{streak.current}</span> day{streak.current === 1 ? "" : "s"}
            </p>
            <Link href="/study" className="mt-3 inline-flex text-sm font-medium text-primary hover:underline">
              Open the stopwatch
            </Link>
          </Panel>
        </div>
      </div>
    </>
  )
}
