"use client"

import { ChartFrame, DataTable, HBars } from "@/components/charts/chart-frame"
import { KIND_LABEL } from "@/lib/data/schemas"

type KindRow = { kind: string; average: number; count: number }
type DistRow = { grade: number; count: number }
type CritRow = { criterion: string; average: number | null; subjects: number }

const kindLabel = (k: string) => KIND_LABEL[k as keyof typeof KIND_LABEL] ?? k

export function KindChart({ rows }: { rows: KindRow[] }) {
  const best = rows.length ? [...rows].sort((a, b) => b.average - a.average)[0] : null
  const worst = rows.length > 1 ? [...rows].sort((a, b) => a.average - b.average)[0] : null
  return (
    <ChartFrame
      title="By assessment type"
      summary={
        best && worst && best.kind !== worst.kind
          ? `You score highest on ${kindLabel(best.kind).toLowerCase()}s (${best.average}%) and lowest on ${kindLabel(worst.kind).toLowerCase()}s (${worst.average}%).`
          : "Average result for each type of task, as a percentage."
      }
      chart={
        rows.length ? (
          <HBars rows={rows.map((r) => ({ label: kindLabel(r.kind), value: r.average }))} max={100} format={(v) => `${v}%`} />
        ) : (
          <p className="py-10 text-center text-sm text-muted-foreground">No graded tasks yet.</p>
        )
      }
      table={<DataTable head={["Type", "Average %", "Tasks"]} rows={rows.map((r) => [kindLabel(r.kind), r.average, r.count])} />}
    />
  )
}

export function DistributionChart({ rows }: { rows: DistRow[] }) {
  const max = Math.max(1, ...rows.map((r) => r.count))
  const total = rows.reduce((s, r) => s + r.count, 0)
  const top = rows.filter((r) => r.grade >= 6).reduce((s, r) => s + r.count, 0)
  return (
    <ChartFrame
      title="Grade distribution"
      summary={total ? `${top} of ${total} subjects are at a 6 or 7.` : "How many subjects sit at each grade."}
      chart={
        <div className="flex h-44 items-end gap-2" role="img" aria-label={rows.map((r) => `${r.count} at grade ${r.grade}`).join(", ")}>
          {rows.map((r) => (
            <div key={r.grade} className="flex flex-1 flex-col items-center gap-1.5">
              <span className="font-mono text-xs tabular text-muted-foreground">{r.count || ""}</span>
              <div className="w-full rounded-t-md bg-primary/85" style={{ height: `${(r.count / max) * 120}px`, minHeight: r.count ? 4 : 0 }} />
              <span className="font-mono text-xs font-semibold tabular">{r.grade}</span>
            </div>
          ))}
        </div>
      }
      table={<DataTable head={["Grade", "Subjects"]} rows={rows.map((r) => [String(r.grade), r.count])} />}
    />
  )
}

export function CriteriaChart({ rows }: { rows: CritRow[] }) {
  const scored = rows.filter((r) => r.average != null) as (CritRow & { average: number })[]
  const strongest = scored.length ? [...scored].sort((a, b) => b.average - a.average)[0] : null
  const weakest = scored.length > 1 ? [...scored].sort((a, b) => a.average - b.average)[0] : null
  return (
    <ChartFrame
      title="MYP criteria strengths"
      summary={
        strongest && weakest && strongest.criterion !== weakest.criterion
          ? `Strongest: criterion ${strongest.criterion} (${strongest.average}/8). Focus area: criterion ${weakest.criterion} (${weakest.average}/8).`
          : "Average level for each criterion across your MYP subjects."
      }
      chart={
        scored.length ? (
          <HBars rows={rows.map((r) => ({ label: `Criterion ${r.criterion}`, value: r.average }))} max={8} format={(v) => `${v}/8`} />
        ) : (
          <p className="py-10 text-center text-sm text-muted-foreground">No MYP criteria yet.</p>
        )
      }
      table={<DataTable head={["Criterion", "Average /8", "Subjects"]} rows={rows.map((r) => [r.criterion, r.average ?? "–", r.subjects])} />}
    />
  )
}
