import type { SubjectWithGrade } from "@/lib/data/types"
import { CRITERIA, toEngineAssessmentPct } from "./breakdown-math"

/** MYP: one bar per criterion, level out of 8. */
export function CriteriaBreakdown({ subject }: { subject: SubjectWithGrade }) {
  const crit = subject.result.criteria
  return (
    <div className="space-y-3">
      <ul className="space-y-3">
        {CRITERIA.map((c) => {
          const level = crit?.[c] ?? null
          return (
            <li key={c} className="grid grid-cols-[2.25rem_1fr_3rem] items-center gap-3">
              <span className="font-display text-sm font-semibold">{c}</span>
              <div
                className="h-2 overflow-hidden rounded-full bg-muted"
                role="meter"
                aria-label={`Criterion ${c}`}
                aria-valuemin={0}
                aria-valuemax={8}
                aria-valuenow={level ?? undefined}
                aria-valuetext={level == null ? "Not assessed yet" : `${level} out of 8`}
              >
                <div className="h-full rounded-full transition-[width] duration-500" style={{ width: `${((level ?? 0) / 8) * 100}%`, backgroundColor: subject.color }} />
              </div>
              <span className="text-right font-mono text-sm tabular">
                {level ?? "–"}
                <span className="text-muted-foreground">/8</span>
              </span>
            </li>
          )
        })}
      </ul>
      <p className="border-t pt-3 text-sm text-muted-foreground">
        Total{" "}
        <span className="font-mono font-semibold tabular text-foreground">{subject.result.criteriaTotal ?? "–"}</span>/32
        {subject.result.partial && (
          <> · projected from {subject.result.criteriaUsed} of 4 criteria</>
        )}
      </p>
    </div>
  )
}

/** DP: each component's average and its weight. */
export function ComponentBreakdown({ subject }: { subject: SubjectWithGrade }) {
  const rows = subject.components.map((c) => {
    const pcts = subject.assessments
      .filter((a) => a.component_id === c.id && a.status === "graded" && a.counts)
      .map(toEngineAssessmentPct)
      .filter((p): p is number => p != null)
    return { id: c.id, name: c.name, weight: Number(c.weight), avg: pcts.length ? pcts.reduce((a, b) => a + b, 0) / pcts.length : null, n: pcts.length }
  })
  if (rows.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No components yet, so every task is weighted by its own weight. Add components (e.g. Paper 1 40%, IA 20%) in subject settings for a
        more accurate estimate.
      </p>
    )
  }
  return (
    <ul className="space-y-3">
      {rows.map((r) => (
        <li key={r.id} className="grid grid-cols-[1fr_auto] items-center gap-x-3 gap-y-1">
          <span className="truncate text-sm font-medium">
            {r.name} <span className="font-mono text-xs text-muted-foreground tabular">{r.weight}%</span>
          </span>
          <span className="font-mono text-sm tabular">{r.avg == null ? "–" : `${r.avg.toFixed(1)}%`}</span>
          <div className="col-span-2 h-2 overflow-hidden rounded-full bg-muted" aria-hidden="true">
            <div className="h-full rounded-full" style={{ width: `${Math.min(r.avg ?? 0, 100)}%`, backgroundColor: subject.color }} />
          </div>
        </li>
      ))}
      <li className="border-t pt-3 text-sm text-muted-foreground">
        Weighted total{" "}
        <span className="font-mono font-semibold tabular text-foreground">
          {subject.result.percentage == null ? "–" : `${subject.result.percentage.toFixed(1)}%`}
        </span>
      </li>
    </ul>
  )
}
