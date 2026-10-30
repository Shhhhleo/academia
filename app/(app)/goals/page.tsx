import type { Metadata } from "next"
import { format, parseISO } from "date-fns"
import { CircleCheck, CircleDashed, Clock, Pencil, Plus, Target, TriangleAlert } from "lucide-react"
import { EmptyState } from "@/components/app/empty-state"
import { PageHeader, Panel } from "@/components/app/page-header"
import { AverageChart } from "@/components/charts/average-chart"
import { ProgressRing } from "@/components/charts/progress-ring"
import { TargetBars } from "@/components/dashboard/target-bars"
import { GoalDialog } from "@/components/goals/goal-dialog"
import { Button } from "@/components/ui/button"
import { averageTimeline } from "@/lib/data/insights"
import { getGoals, getWorkspace } from "@/lib/data/queries"
import { GOAL_STATUS_LABEL, goalProgress, type GoalStatus } from "@/lib/goals/progress"
import { cn } from "@/lib/utils"

export const metadata: Metadata = { title: "Goals & Progress" }

const STATUS_STYLE: Record<GoalStatus, { icon: typeof Target; className: string; ring: string }> = {
  achieved: { icon: CircleCheck, className: "text-success-text", ring: "var(--success)" },
  "on-track": { icon: Clock, className: "text-primary", ring: "var(--primary)" },
  "at-risk": { icon: TriangleAlert, className: "text-warning-text", ring: "var(--warning)" },
  "no-data": { icon: CircleDashed, className: "text-muted-foreground", ring: "var(--muted-foreground)" },
}

export default async function GoalsPage() {
  const [ws, goals] = await Promise.all([getWorkspace(), getGoals()])
  const rows = goals.map((g) => ({ g, p: goalProgress(g, { subjects: ws.subjects, overview: ws.overview }) }))
  const counts = rows.reduce<Record<GoalStatus, number>>(
    (acc, r) => ({ ...acc, [r.p.status]: acc[r.p.status] + 1 }),
    { achieved: 0, "on-track": 0, "at-risk": 0, "no-data": 0 },
  )
  const timeline = averageTimeline(ws.subjects)
  const withTargets = ws.subjects.filter((s) => s.target_grade != null)
  const projected = ws.subjects.reduce((sum, s) => sum + (s.target_grade ?? s.effectiveGrade ?? 0), 0)

  const add = (
    <Button size="lg" className="h-9 px-3.5">
      <Plus aria-hidden="true" /> New goal
    </Button>
  )

  return (
    <>
      <PageHeader
        title="Goals & Progress"
        description="Set targets for subjects or your overall points. Progress updates every time you log a result."
        actions={<GoalDialog trigger={add} />}
      />

      {rows.length === 0 ? (
        <EmptyState
          icon={Target}
          title="Set your first goal"
          description="Try “7 in Mathematics” or “40 points overall”. Academia tracks it against your live grades."
          action={<GoalDialog trigger={add} />}
          className="mb-6"
        />
      ) : (
        <>
          <p className="mb-4 text-sm text-muted-foreground" role="status">
            <span className="font-mono tabular text-foreground">{counts.achieved}</span> achieved ·{" "}
            <span className="font-mono tabular text-foreground">{counts["on-track"]}</span> on track ·{" "}
            <span className="font-mono tabular text-foreground">{counts["at-risk"]}</span> need attention
          </p>
          <ul className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {rows.map(({ g, p }) => {
              const st = STATUS_STYLE[p.status]
              const subject = ws.subjects.find((s) => s.id === g.subject_id)
              return (
                <li key={g.id} className="flex gap-4 rounded-[var(--radius-card)] border bg-card p-5 shadow-card">
                  <ProgressRing value={p.ratio} size={64} stroke={6} color={subject?.color ?? st.ring} label={g.title}>
                    <span className="font-mono text-sm font-semibold tabular">{p.current ?? "–"}</span>
                  </ProgressRing>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <h2 className="truncate font-display text-base font-semibold">{g.title}</h2>
                      <GoalDialog
                        goal={g}
                        trigger={
                          <button type="button" className="grid size-7 shrink-0 place-items-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground" aria-label={`Edit ${g.title}`}>
                            <Pencil className="size-3.5" aria-hidden="true" />
                          </button>
                        }
                      />
                    </div>
                    <p className={cn("mt-1 inline-flex items-center gap-1 text-xs font-medium", st.className)}>
                      <st.icon className="size-3.5" aria-hidden="true" /> {GOAL_STATUS_LABEL[p.status]}
                    </p>
                    <p className="mt-2 text-xs text-muted-foreground">
                      <span className="font-mono tabular text-foreground">{p.current ?? "–"}</span> of{" "}
                      <span className="font-mono tabular text-foreground">{p.target}</span>
                      {g.deadline && ` · by ${format(parseISO(g.deadline), "d MMM yyyy")}`}
                    </p>
                  </div>
                </li>
              )
            })}
          </ul>
        </>
      )}

      <div className="grid gap-4 lg:grid-cols-5">
        <Panel title="Target vs current" description="Every subject against its target grade." className="lg:col-span-2">
          {ws.subjects.length ? <TargetBars subjects={ws.subjects} /> : <p className="text-sm text-muted-foreground">Add subjects to compare.</p>}
        </Panel>
        <Panel
          title="Progress timeline"
          description={
            timeline.length > 1
              ? `Your average moved from ${timeline[0].average.toFixed(2)} to ${timeline[timeline.length - 1].average.toFixed(2)}.`
              : "Your average after each graded task."
          }
          className="lg:col-span-3"
        >
          {timeline.length > 1 ? <AverageChart points={timeline} height={260} /> : <p className="py-16 text-center text-sm text-muted-foreground">Not enough data yet.</p>}
        </Panel>
      </div>

      <Panel title="Projected outcome" className="mt-4">
        <dl className="grid gap-4 sm:grid-cols-3">
          <div>
            <dt className="text-xs text-muted-foreground">If grades stay where they are</dt>
            <dd className="mt-1 font-mono text-2xl font-semibold tabular">
              {ws.overview.totalPoints}
              <span className="text-sm text-muted-foreground">/{ws.overview.maxPoints}</span>
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">If you hit every target</dt>
            <dd className="mt-1 font-mono text-2xl font-semibold tabular">
              {projected + (ws.overview.corePoints ?? 0)}
              <span className="text-sm text-muted-foreground">/{ws.overview.maxPoints}</span>
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Subjects with a target</dt>
            <dd className="mt-1 font-mono text-2xl font-semibold tabular">
              {withTargets.length}
              <span className="text-sm text-muted-foreground">/{ws.subjects.length}</span>
            </dd>
          </div>
        </dl>
      </Panel>
    </>
  )
}
