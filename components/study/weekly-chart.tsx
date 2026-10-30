"use client"

import { format, parseISO } from "date-fns"
import { ChartFrame, DataTable } from "@/components/charts/chart-frame"
import { formatMinutes } from "@/lib/study/streak"
import { cn } from "@/lib/utils"

type Day = { date: string; minutes: number; isToday: boolean; isFuture: boolean }

/** Seven daily bars against the daily goal line, with a table alternative. */
export function WeeklyStudyChart({ days, goal }: { days: Day[]; goal: number }) {
  const max = Math.max(goal * 1.25, ...days.map((d) => d.minutes), 1)
  const hit = days.filter((d) => d.minutes >= goal).length
  const goalPct = (goal / max) * 100
  return (
    <ChartFrame
      title="Weekly progress"
      summary={`${hit} of 7 days at or above your ${formatMinutes(goal)} goal.`}
      chart={
        <div className="relative">
          <div className="relative flex h-48 items-end gap-2 sm:gap-3" role="img" aria-label={days.map((d) => `${format(parseISO(d.date), "EEEE")}: ${formatMinutes(d.minutes)}`).join(", ")}>
            <div className="pointer-events-none absolute inset-x-0 border-t border-dashed border-muted-foreground/60" style={{ bottom: `${goalPct}%` }} aria-hidden="true">
              <span className="absolute -top-5 right-0 text-[10px] text-muted-foreground">Goal {formatMinutes(goal)}</span>
            </div>
            {days.map((d) => (
              <div key={d.date} className="flex h-full flex-1 flex-col justify-end">
                <div
                  className={cn(
                    "w-full rounded-t-md transition-[height] duration-500",
                    d.minutes >= goal ? "bg-success" : d.minutes > 0 ? "bg-primary/80" : "bg-muted",
                    d.isFuture && "opacity-40",
                  )}
                  style={{ height: `${Math.max(d.minutes > 0 ? 3 : 2, (d.minutes / max) * 100)}%` }}
                />
              </div>
            ))}
          </div>
          <div className="mt-2 flex gap-2 sm:gap-3">
            {days.map((d) => (
              <div key={d.date} className="flex-1 text-center">
                <p className={cn("text-xs", d.isToday ? "font-semibold text-foreground" : "text-muted-foreground")}>{format(parseISO(d.date), "EEE")}</p>
                <p className="font-mono text-[11px] text-muted-foreground tabular">{d.minutes ? formatMinutes(d.minutes) : "–"}</p>
              </div>
            ))}
          </div>
        </div>
      }
      table={<DataTable head={["Day", "Studied", "Goal met"]} rows={days.map((d) => [format(parseISO(d.date), "EEE d MMM"), formatMinutes(d.minutes), d.minutes >= goal ? "Yes" : "No"])} />}
    />
  )
}
