"use client"

import { format, parseISO } from "date-fns"
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"

export interface AveragePoint {
  date: string
  average: number
  subjects: number
}

/** Single series: average grade across subjects over time (title outside names it). */
export function AverageChart({ points, height = 220 }: { points: AveragePoint[]; height?: number }) {
  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={points} margin={{ top: 8, right: 12, bottom: 0, left: -24 }}>
          <defs>
            <linearGradient id="avg-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.18} />
              <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke="var(--border)" />
          <XAxis
            dataKey="date"
            tickFormatter={(d: string) => format(parseISO(d), "d MMM")}
            tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
            axisLine={{ stroke: "var(--border)" }}
            tickLine={false}
            minTickGap={28}
          />
          <YAxis
            domain={[1, 7]}
            ticks={[1, 2, 3, 4, 5, 6, 7]}
            tick={{ fill: "var(--muted-foreground)", fontSize: 12, fontFamily: "var(--font-jetbrains)" }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            cursor={{ stroke: "var(--muted-foreground)", strokeDasharray: "3 3" }}
            content={({ active, payload }) => {
              const p = active ? (payload?.[0]?.payload as AveragePoint | undefined) : undefined
              if (!p) return null
              return (
                <div className="rounded-lg border bg-popover px-3 py-2 text-xs shadow-md">
                  <p className="font-medium text-foreground">{format(parseISO(p.date), "d MMM yyyy")}</p>
                  <p className="mt-1 text-foreground">
                    Average <span className="font-mono font-semibold tabular">{p.average.toFixed(2)}</span>
                    <span className="text-muted-foreground"> across {p.subjects} subject{p.subjects === 1 ? "" : "s"}</span>
                  </p>
                </div>
              )
            }}
          />
          <Area
            type="monotone"
            dataKey="average"
            stroke="var(--primary)"
            strokeWidth={2}
            fill="url(#avg-fill)"
            dot={false}
            activeDot={{ r: 5, fill: "var(--primary)", stroke: "var(--card)", strokeWidth: 2 }}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
