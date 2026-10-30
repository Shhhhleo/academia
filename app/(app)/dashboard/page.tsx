import type { Metadata } from "next"
import Link from "next/link"
import { addDays, differenceInCalendarDays, format, parseISO } from "date-fns"
import { BookOpen, CalendarClock, Sigma, Target, TrendingUp } from "lucide-react"
import { EmptyState } from "@/components/app/empty-state"
import { PageHeader, Panel } from "@/components/app/page-header"
import { AverageChart } from "@/components/charts/average-chart"
import { ProgressRing } from "@/components/charts/progress-ring"
import { RecentAssessments, UpcomingList } from "@/components/dashboard/lists"
import { TargetBars } from "@/components/dashboard/target-bars"
import { SubjectCard } from "@/components/subjects/subject-card"
import { AddAssessmentButton } from "@/components/subjects/subject-actions"
import { SubjectDialog } from "@/components/subjects/subject-dialog"
import { Button } from "@/components/ui/button"
import { averageTimeline, upcomingItems } from "@/lib/data/insights"
import { getEvents, getGoals, getWorkspace } from "@/lib/data/queries"
import { GOAL_STATUS_LABEL, goalProgress } from "@/lib/goals/progress"

export const metadata: Metadata = { title: "Dashboard" }

const iso = (d: Date) => d.toISOString().slice(0, 10)

export default async function DashboardPage() {
  const today = iso(new Date())
  const [ws, goals, events] = await Promise.all([getWorkspace(), getGoals(), getEvents(today, iso(addDays(new Date(), 60)))])
  const { subjects, overview, profile } = ws
  const firstName = profile.display_name.split(" ")[0]

  if (subjects.length === 0) {
    return (
      <>
        <PageHeader title={`Welcome, ${firstName}`} description="Let’s set up your year. Add your subjects, then log each summative as it’s graded." />
        <EmptyState
          icon={BookOpen}
          title="Add your subjects to get started"
          description="Academia turns every criterion level and score you enter into a live IB grade, trend and target check."
          action={
            <SubjectDialog
              defaultOpen={false}
              trigger={
                <Button size="lg" className="h-10 px-4">
                  Add your first subject
                </Button>
              }
            />
          }
        />
      </>
    )
  }

  const timeline = averageTimeline(subjects)
  const upcoming = upcomingItems(subjects, events, today, 6)
  const goalRows = goals.map((g) => ({ g, p: goalProgress(g, { subjects, overview }) }))
  const goalsOk = goalRows.filter((x) => x.p.status === "achieved" || x.p.status === "on-track").length
  const next = upcoming[0]
  const nextDays = next ? differenceInCalendarDays(parseISO(next.date), parseISO(today)) : null

  return (
    <>
      <PageHeader
        eyebrow={`${ws.year.label} · ${profile.programme}`}
        title={`Welcome back, ${firstName}`}
        description="Here’s where you stand across every subject right now."
        actions={<AddAssessmentButton />}
      />

      <section aria-label="Overview" className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat icon={TrendingUp} label="Average grade" note={`across ${overview.gradedSubjects} of ${subjects.length} subjects`}>
          {overview.average == null ? "–" : overview.average.toFixed(2)}
          <span className="text-base font-medium text-muted-foreground">/7</span>
        </Stat>
        <Stat icon={Sigma} label={profile.programme === "DP" ? "Diploma points" : "Total points"} note={profile.programme === "DP" ? "6 subjects + core" : `${subjects.length} subjects × 7`}>
          {overview.totalPoints}
          <span className="text-base font-medium text-muted-foreground">/{overview.maxPoints}</span>
        </Stat>
        <Stat icon={Target} label="Goals on track" note={goals.length ? "achieved or within reach" : "set a goal to track"}>
          {goals.length ? goalsOk : "–"}
          {goals.length > 0 && <span className="text-base font-medium text-muted-foreground">/{goals.length}</span>}
        </Stat>
        <Stat
          icon={CalendarClock}
          label="Next deadline"
          note={next ? next.title : "nothing scheduled"}
        >
          {nextDays == null ? "–" : nextDays === 0 ? "Today" : `${nextDays}d`}
        </Stat>
      </section>

      <div className="grid gap-4 lg:grid-cols-3">
        <Panel title="Grade trend" description="Average of your latest grade in each subject, after every graded task." className="lg:col-span-2">
          {timeline.length > 1 ? (
            <AverageChart points={timeline} />
          ) : (
            <p className="py-16 text-center text-sm text-muted-foreground">Log a few graded tasks to see your trend line.</p>
          )}
        </Panel>
        <Panel title="Current vs target" description="Bar shows your grade; the tick marks your target." action={<Link href="/goals" className="text-xs font-medium text-primary hover:underline">Goals</Link>}>
          <TargetBars subjects={subjects} />
        </Panel>
      </div>

      <h2 className="mt-10 mb-4 text-lg font-semibold">Subjects</h2>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {subjects.map((s) => (
          <SubjectCard key={s.id} subject={s} />
        ))}
      </div>

      <div className="mt-10 grid gap-4 lg:grid-cols-3">
        <Panel title="Recent assessments" action={<Link href="/assessments" className="text-xs font-medium text-primary hover:underline">View all</Link>}>
          <RecentAssessments subjects={subjects} />
        </Panel>
        <Panel title="Coming up" action={<Link href="/calendar" className="text-xs font-medium text-primary hover:underline">Calendar</Link>}>
          <UpcomingList items={upcoming} today={today} />
        </Panel>
        <Panel title="Goals" action={<Link href="/goals" className="text-xs font-medium text-primary hover:underline">Manage</Link>}>
          {goalRows.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Set a target like “7 in Physics” or “38 points” on{" "}
              <Link href="/goals" className="font-medium text-primary hover:underline">Goals &amp; Progress</Link>.
            </p>
          ) : (
            <ul className="space-y-3">
              {goalRows.slice(0, 4).map(({ g, p }) => (
                <li key={g.id} className="flex items-center gap-3">
                  <ProgressRing value={p.ratio} size={44} stroke={5} label={g.title}>
                    <span className="font-mono text-[11px] font-semibold tabular">{Math.round(p.ratio * 100)}</span>
                  </ProgressRing>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{g.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {GOAL_STATUS_LABEL[p.status]}
                      {g.deadline && ` · by ${format(parseISO(g.deadline), "d MMM")}`}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </>
  )
}

function Stat({
  icon: Icon,
  label,
  note,
  children,
}: {
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>
  label: string
  note: string
  children: React.ReactNode
}) {
  return (
    <div className="rounded-[var(--radius-card)] border bg-card p-4 shadow-card sm:p-5">
      <p className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
        <Icon className="size-3.5" aria-hidden={true} />
        {label}
      </p>
      <p className="mt-2 font-mono text-3xl font-semibold tracking-tight tabular">{children}</p>
      <p className="mt-1 truncate text-xs text-muted-foreground">{note}</p>
    </div>
  )
}
