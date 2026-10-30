"use client"

import { useTheme } from "next-themes"
import { useEffect, useState } from "react"
import { format, parseISO } from "date-fns"
import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { seriesColor } from "@/lib/colors"

export interface GradePoint {
  date: string
  grade: number
  label?: string
  percentage?: number | null
}

function useIsDark() {
  const { resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  return mounted && resolvedTheme === "dark"
}

/** Single-series grade history on a fixed 1–7 scale; the title outside names the series. */
export function GradeLineChart({
  points,
  color,
  target,
  height = 240,
}: {
  points: GradePoint[]
  color: string
  target?: number | null
  height?: number
}) {
  const dark = useIsDark()
  const stroke = seriesColor(color, dark)

  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={points} margin={{ top: 8, right: 12, bottom: 0, left: -24 }}>
          <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="0" />
          <XAxis
            dataKey="date"
            tickFormatter={(d: string) => format(parseISO(d), "d MMM")}
            tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
            axisLine={{ stroke: "var(--border)" }}
            tickLine={false}
            minTickGap={24}
          />
          <YAxis
            domain={[1, 7]}
            ticks={[1, 2, 3, 4, 5, 6, 7]}
            tick={{ fill: "var(--muted-foreground)", fontSize: 12, fontFamily: "var(--font-jetbrains)" }}
            axisLine={false}
            tickLine={false}
            allowDecimals={false}
          />
          {target != null && (
            <ReferenceLine
              y={target}
              stroke="var(--muted-foreground)"
              strokeDasharray="4 4"
              label={{ value: `Target ${target}`, position: "insideTopRight", fill: "var(--muted-foreground)", fontSize: 11 }}
            />
          )}
          <Tooltip
            cursor={{ stroke: "var(--muted-foreground)", strokeWidth: 1, strokeDasharray: "3 3" }}
            content={({ active, payload }) => {
              const p = active ? (payload?.[0]?.payload as GradePoint | undefined) : undefined
              if (!p) return null
              return (
                <div className="rounded-lg border bg-popover px-3 py-2 text-xs shadow-md">
                  <p className="font-medium text-foreground">{format(parseISO(p.date), "d MMM yyyy")}</p>
                  {p.label && <p className="text-muted-foreground">After “{p.label}”</p>}
                  <p className="mt-1 text-foreground">
                    Grade <span className="font-mono font-semibold tabular">{p.grade}</span>
                    {p.percentage != null && <span className="text-muted-foreground"> · {p.percentage.toFixed(1)}%</span>}
                  </p>
                </div>
              )
            }}
          />
          <Line
            type="linear"
            dataKey="grade"
            stroke={stroke}
            strokeWidth={2}
            dot={{ r: 4, fill: stroke, stroke: "var(--card)", strokeWidth: 2 }}
            activeDot={{ r: 6, fill: stroke, stroke: "var(--card)", strokeWidth: 2 }}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
