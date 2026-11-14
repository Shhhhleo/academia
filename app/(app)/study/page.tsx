import type { Metadata } from "next"
import { format, parseISO } from "date-fns"
import { CircleCheck, Flame, Hourglass } from "lucide-react"
import { PageHeader, Panel } from "@/components/app/page-header"
import { ProgressRing } from "@/components/charts/progress-ring"
import { Stopwatch } from "@/components/study/stopwatch"
import { DeleteSessionButton, LogSessionForm, StudyGoalForm } from "@/components/study/study-forms"
import { WeeklyStudyChart } from "@/components/study/weekly-chart"
import { getStudySessions, getWorkspace } from "@/lib/data/queries"
import { computeStreak, dailyTotals, formatMinutes, localDay, weekSummary } from "@/lib/study/streak"
import { cn } from "@/lib/utils"

export const metadata: Metadata = { title: "Study Log" }

export default async function StudyPage() {
  const [ws, sessions] = await Promise.all([getWorkspace(), getStudySessions()])
  const { profile, subjects } = ws
  const today = localDay(new Date(), profile.timezone)
  const totals = dailyTotals(sessions)
  const goal = profile.daily_study_goal_minutes
  const streak = computeStreak(totals, goal, today)
  const week = weekSummary(totals, today, profile.week_start === 0 ? 0 : 1)
  const byId = new Map(subjects.map((s) => [s.id, s]))

  const weekSessions = sessions.filter((s) => s.studied_on >= week.start && s.studied_on <= week.days[6].date)
  const bySubject = new Map<string, number>()
  for (const s of weekSessions) bySubject.set(s.subject_id ?? "", (bySubject.get(s.subject_id ?? "") ?? 0) + s.minutes)
  const subjectRows = [...bySubject.entries()].sort((a, b) => b[1] - a[1])
  const maxSubject = Math.max(1, ...subjectRows.map(([, m]) => m))

  const StreakIcon = streak.metToday ? CircleCheck : streak.atRisk ? Hourglass : Flame
  const streakNote = streak.metToday
    ? "Today’s goal is done. See you tomorrow."
    : streak.atRisk
      ? `Study ${formatMinutes(goal - streak.todayMinutes)} more today to keep it alive.`
      : `Study ${formatMinutes(goal)} today to start a streak.`

  return (
    <>
      <PageHeader title="Study Log" description="Time your study, log it by subject, and keep your streak going by hitting your daily goal." />

      <section aria-label="Study summary" className="mb-6 grid gap-4 md:grid-cols-3">
        <div
          className={cn(
            "relative overflow-hidden rounded-[var(--radius-card)] border p-5 shadow-card",
            streak.current > 0 ? "border-warning/40 bg-[linear-gradient(135deg,color-mix(in_oklab,var(--warning)_14%,var(--card)),var(--card)_60%)]" : "bg-card",
          )}
        >
          <p className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <Flame className={cn("size-4", streak.current > 0 ? "text-warning" : "text-muted-foreground")} aria-hidden="true" /> Study streak
          </p>
          <p className="mt-2 font-mono text-4xl font-semibold tracking-tight tabular">
            {streak.current}
            <span className="ml-1.5 font-sans text-base font-medium text-muted-foreground">day{streak.current === 1 ? "" : "s"}</span>
          </p>
          <p className={cn("mt-1 flex items-center gap-1.5 text-xs", streak.atRisk ? "font-medium text-warning-text" : "text-muted-foreground")}>
            <StreakIcon className="size-3.5 shrink-0" aria-hidden="true" /> {streakNote}
          </p>
          <p className="mt-3 text-xs text-muted-foreground">
            Best: <span className="font-mono tabular text-foreground">{streak.best}</span> days
          </p>
        </div>

        <div className="flex items-center gap-4 rounded-[var(--radius-card)] border bg-card p-5 shadow-card">
          <ProgressRing value={streak.todayMinutes / goal} size={84} stroke={8} color={streak.metToday ? "var(--success)" : "var(--primary)"} label="Today's study goal">
            <span className="font-mono text-sm font-semibold tabular">{Math.min(100, Math.round((streak.todayMinutes / goal) * 100))}%</span>
          </ProgressRing>
          <div>
            <p className="text-xs font-medium text-muted-foreground">Today</p>
            <p className="font-mono text-2xl font-semibold tabular">{formatMinutes(streak.todayMinutes)}</p>
            <p className="text-xs text-muted-foreground">of your {formatMinutes(goal)} daily goal</p>
          </div>
        </div>

        <div className="rounded-[var(--radius-card)] border bg-card p-5 shadow-card">
          <p className="text-xs font-medium text-muted-foreground">This week</p>
          <p className="mt-2 font-mono text-2xl font-semibold tabular">
            {formatMinutes(week.total)}
            {profile.weekly_study_goal_minutes > 0 && <span className="text-sm font-medium text-muted-foreground"> / {formatMinutes(profile.weekly_study_goal_minutes)}</span>}
          </p>
          {profile.weekly_study_goal_minutes > 0 && (
            <div className="mt-3 h-2 rounded-full bg-muted" role="meter" aria-label="Weekly study goal" aria-valuemin={0} aria-valuemax={profile.weekly_study_goal_minutes} aria-valuenow={week.total}>
              <div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(100, (week.total / profile.weekly_study_goal_minutes) * 100)}%` }} />
            </div>
          )}
          <p className="mt-2 text-xs text-muted-foreground">{week.days.filter((d) => d.minutes >= goal).length} of 7 days hit your daily goal</p>
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <Stopwatch />
        <LogSessionForm today={today} />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <WeeklyStudyChart days={week.days} goal={goal} />
        </div>
        <Panel title="By subject this week" className="lg:col-span-2">
          {subjectRows.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">No study logged this week yet.</p>
          ) : (
            <ul className="space-y-3">
              {subjectRows.map(([id, minutes]) => {
                const s = byId.get(id)
                return (
                  <li key={id || "general"} className="grid grid-cols-[minmax(6rem,9rem)_1fr_3.5rem] items-center gap-3 text-sm">
                    <span className="truncate">{s?.name ?? "General study"}</span>
                    <div className="h-2.5 rounded-full bg-muted" aria-hidden="true">
                      <div className="h-full rounded-full" style={{ width: `${(minutes / maxSubject) * 100}%`, backgroundColor: s?.color ?? "var(--muted-foreground)" }} />
                    </div>
                    <span className="text-right font-mono text-xs tabular">{formatMinutes(minutes)}</span>
                  </li>
                )
              })}
            </ul>
          )}
        </Panel>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-5">
        <Panel title="Recent sessions" className="lg:col-span-3">
          {sessions.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Your logged sessions will appear here.</p>
          ) : (
            <ul className="-my-2 divide-y">
              {sessions.slice(0, 15).map((s) => {
                const subj = s.subject_id ? byId.get(s.subject_id) : undefined
                return (
                  <li key={s.id} className="flex items-center gap-3 py-2.5">
                    <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: subj?.color ?? "var(--muted-foreground)" }} aria-hidden="true" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{subj?.name ?? "General study"}</span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {format(parseISO(s.studied_on), "EEE d MMM")}
                        {s.note && ` · ${s.note}`}
                      </span>
                    </span>
                    <span className="font-mono text-sm tabular">{formatMinutes(s.minutes)}</span>
                    <DeleteSessionButton id={s.id} />
                  </li>
                )
              })}
            </ul>
          )}
        </Panel>
        <Panel title="Study goals" description="Your daily goal powers the streak, like a Snapchat streak for studying." className="lg:col-span-2">
          <StudyGoalForm daily={goal} weekly={profile.weekly_study_goal_minutes} />
        </Panel>
      </div>
    </>
  )
}
