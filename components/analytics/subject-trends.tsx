"use client"

import { useTheme } from "next-themes"
import { useMemo, useState } from "react"
import { useMounted } from "@/hooks/use-mounted"
import { format, parseISO } from "date-fns"
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { ChartFrame, DataTable } from "@/components/charts/chart-frame"
import { seriesColor } from "@/lib/colors"
import { trendMatrix } from "@/lib/data/analytics"
import { cn } from "@/lib/utils"

interface SeriesSubject {
  id: string
  name: string
  color: string
  history: { date: string; grade: number }[]
}

/** Multi-series grade history. Legend doubles as series toggles; colour follows the subject. */
export function SubjectTrends({ subjects }: { subjects: SeriesSubject[] }) {
  const { resolvedTheme } = useTheme()
  const mounted = useMounted()
  const dark = mounted && resolvedTheme === "dark"

  const withData = subjects.filter((s) => s.history.length > 0)
  const [hidden, setHidden] = useState<Set<string>>(() => new Set(withData.slice(4).map((s) => s.id)))
  const rows = useMemo(() => trendMatrix(withData), [withData])
  const visible = withData.filter((s) => !hidden.has(s.id))

  const best = [...withData].sort((a, b) => (b.history.at(-1)!.grade - b.history[0].grade) - (a.history.at(-1)!.grade - a.history[0].grade))[0]
  const bestDelta = best ? best.history.at(-1)!.grade - best.history[0].grade : 0

  return (
    <ChartFrame
      title="Subject trends"
      summary={
        withData.length === 0
          ? "No graded tasks yet."
          : bestDelta > 0
            ? `${best.name} has improved most, up ${bestDelta} since your first graded task.`
            : "Grades have held steady since your first graded tasks."
      }
      className="lg:col-span-2"
      chart={
        withData.length === 0 ? (
          <p className="py-16 text-center text-sm text-muted-foreground">Log graded tasks to see trends.</p>
        ) : (
          <>
            <div className="mb-3 flex flex-wrap gap-1.5" role="group" aria-label="Show or hide subjects">
              {withData.map((s) => {
                const on = !hidden.has(s.id)
                return (
                  <button
                    key={s.id}
                    type="button"
                    aria-pressed={on}
                    onClick={() =>
                      setHidden((h) => {
                        const n = new Set(h)
                        if (on) n.add(s.id)
                        else n.delete(s.id)
                        return n
                      })
                    }
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                      on ? "bg-card text-foreground" : "bg-muted text-muted-foreground line-through",
                    )}
                  >
                    <span className="size-2 rounded-full" style={{ backgroundColor: on ? seriesColor(s.color, dark) : "var(--muted-foreground)" }} aria-hidden="true" />
                    {s.name}
                  </button>
                )
              })}
            </div>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={rows} margin={{ top: 8, right: 12, bottom: 0, left: -24 }}>
                  <CartesianGrid vertical={false} stroke="var(--border)" />
                  <XAxis dataKey="date" tickFormatter={(d: string) => format(parseISO(d), "d MMM")} tick={{ fill: "var(--muted-foreground)", fontSize: 12 }} axisLine={{ stroke: "var(--border)" }} tickLine={false} minTickGap={28} />
                  <YAxis domain={[1, 7]} ticks={[1, 2, 3, 4, 5, 6, 7]} tick={{ fill: "var(--muted-foreground)", fontSize: 12, fontFamily: "var(--font-jetbrains)" }} axisLine={false} tickLine={false} />
                  <Tooltip
                    cursor={{ stroke: "var(--muted-foreground)", strokeDasharray: "3 3" }}
                    content={({ active, payload, label }) => {
                      if (!active || !payload?.length) return null
                      return (
                        <div className="min-w-40 rounded-lg border bg-popover px-3 py-2 text-xs shadow-md">
                          <p className="mb-1 font-medium text-foreground">{format(parseISO(String(label)), "d MMM yyyy")}</p>
                          {payload.map((p) => {
                            const s = withData.find((x) => x.id === p.dataKey)
                            return (
                              <p key={String(p.dataKey)} className="flex items-center justify-between gap-4 text-foreground">
                                <span className="inline-flex items-center gap-1.5">
                                  <span className="size-2 rounded-full" style={{ backgroundColor: String(p.color) }} aria-hidden="true" />
                                  {s?.name}
                                </span>
                                <span className="font-mono font-semibold tabular">{String(p.value)}</span>
                              </p>
                            )
                          })}
                        </div>
                      )
                    }}
                  />
                  {visible.map((s) => (
                    <Line
                      key={s.id}
                      dataKey={s.id}
                      name={s.name}
                      type="linear"
                      stroke={seriesColor(s.color, dark)}
                      strokeWidth={2}
                      dot={{ r: 3.5, fill: seriesColor(s.color, dark), stroke: "var(--card)", strokeWidth: 2 }}
                      activeDot={{ r: 5, stroke: "var(--card)", strokeWidth: 2 }}
                      connectNulls
                      isAnimationActive={false}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </>
        )
      }
      table={
        <DataTable
          head={["Subject", "First", "Latest", "Change", "Graded tasks"]}
          rows={withData.map((s) => {
            const first = s.history[0].grade
            const last = s.history.at(-1)!.grade
            return [s.name, first, last, last - first > 0 ? `+${last - first}` : last - first, s.history.length]
          })}
        />
      }
    />
  )
}
