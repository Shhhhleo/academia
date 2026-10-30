"use client"

import { useState, type ReactNode } from "react"
import { BarChart3, Table2 } from "lucide-react"
import { cn } from "@/lib/utils"

/** Panel with a one-line insight, and a Chart / Table switch so no chart is the only way to read the data. */
export function ChartFrame({
  title,
  summary,
  chart,
  table,
  className,
}: {
  title: string
  summary: ReactNode
  chart: ReactNode
  table: ReactNode
  className?: string
}) {
  const [view, setView] = useState<"chart" | "table">("chart")
  return (
    <section className={cn("rounded-[var(--radius-card)] border bg-card p-[var(--card-pad)] shadow-card", className)}>
      <div className="mb-4 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="text-base font-semibold">{title}</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">{summary}</p>
        </div>
        <div className="inline-flex shrink-0 rounded-lg border bg-muted p-0.5" role="group" aria-label={`${title} view`}>
          {(["chart", "table"] as const).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setView(v)}
              aria-pressed={view === v}
              className={cn(
                "inline-flex h-7 items-center gap-1 rounded-md px-2 text-xs font-medium text-muted-foreground transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                view === v && "bg-card text-foreground shadow-sm",
              )}
            >
              {v === "chart" ? <BarChart3 className="size-3.5" aria-hidden="true" /> : <Table2 className="size-3.5" aria-hidden="true" />}
              {v === "chart" ? "Chart" : "Table"}
            </button>
          ))}
        </div>
      </div>
      {view === "chart" ? chart : <div className="overflow-x-auto">{table}</div>}
    </section>
  )
}

/** Simple accessible horizontal bars (single hue) with direct value labels. */
export function HBars({
  rows,
  max,
  format = (v) => String(v),
  color = "var(--primary)",
}: {
  rows: { label: string; value: number | null; note?: string }[]
  max: number
  format?: (v: number) => string
  color?: string
}) {
  return (
    <ul className="space-y-3">
      {rows.map((r) => (
        <li key={r.label} className="grid grid-cols-[minmax(6rem,9rem)_1fr_3.5rem] items-center gap-3 text-sm">
          <span className="truncate">{r.label}</span>
          <div className="h-2.5 rounded-full bg-muted" aria-hidden="true">
            <div className="h-full rounded-full" style={{ width: `${((r.value ?? 0) / max) * 100}%`, backgroundColor: color }} />
          </div>
          <span className="text-right font-mono text-xs tabular">{r.value == null ? "–" : format(r.value)}</span>
        </li>
      ))}
    </ul>
  )
}

export function DataTable({ head, rows }: { head: string[]; rows: (string | number)[][] }) {
  return (
    <table className="w-full text-sm">
      <thead className="text-left text-xs text-muted-foreground">
        <tr>
          {head.map((h) => (
            <th key={h} scope="col" className="py-2 pr-4 font-medium">
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody className="divide-y">
        {rows.map((r, i) => (
          <tr key={i}>
            {r.map((c, j) => (
              <td key={j} className={cn("py-2 pr-4", j > 0 && "font-mono tabular")}>
                {c}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  )
}
