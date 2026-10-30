"use client"

import { useEffect, useState, useTransition } from "react"
import { Check, Pause, Play, RotateCcw } from "lucide-react"
import { toast } from "sonner"
import { useShell } from "@/components/app/shell-context"
import { Panel } from "@/components/app/page-header"
import { Button } from "@/components/ui/button"
import { NativeSelect } from "@/components/ui/native-select"
import { logStudySession } from "@/lib/data/planner-actions"
import { localDay } from "@/lib/study/streak"
import { cn } from "@/lib/utils"
import { EMPTY, elapsedMs, formatClock, useStopwatchState, writeStopwatch } from "./stopwatch-store"

/** Pausable study stopwatch. Finishing logs the time as a study session for the chosen subject. */
export function Stopwatch() {
  const { subjects, profile } = useShell()
  const state = useStopwatchState()
  const [now, setNow] = useState(0)
  const [pending, start] = useTransition()

  useEffect(() => {
    if (!state.running) return
    const tick = () => setNow(Date.now())
    const t = setInterval(tick, 250)
    tick()
    return () => clearInterval(t)
  }, [state.running])

  const ms = elapsedMs(state, now || state.runStartedAt || 0)
  const clock = formatClock(ms)
  const hasTime = ms >= 1000 || state.accumulatedMs > 0

  useEffect(() => {
    if (!state.running) return
    const base = document.title
    document.title = `${clock} · Studying`
    return () => {
      document.title = base
    }
  }, [state.running, clock])

  const play = () => {
    const t = Date.now()
    setNow(t)
    writeStopwatch({ ...state, running: true, runStartedAt: t, firstStartedAt: state.firstStartedAt ?? t })
  }
  const pause = () => {
    const t = Date.now()
    writeStopwatch({ ...state, running: false, runStartedAt: null, accumulatedMs: elapsedMs(state, t) })
  }
  const reset = () => writeStopwatch({ ...EMPTY, subjectId: state.subjectId })
  const finish = () => {
    const total = elapsedMs(state, Date.now())
    const minutes = Math.max(1, Math.round(total / 60_000))
    start(async () => {
      const r = await logStudySession({
        subjectId: state.subjectId || null,
        studiedOn: localDay(new Date(state.firstStartedAt ?? Date.now()), profile.timezone),
        minutes,
        startedAt: state.firstStartedAt ? new Date(state.firstStartedAt).toISOString() : null,
      })
      if (!r.ok) return void toast.error(r.error)
      toast.success(`Logged ${minutes} minute${minutes === 1 ? "" : "s"} of study`)
      writeStopwatch({ ...EMPTY, subjectId: state.subjectId })
    })
  }

  return (
    <Panel title="Stopwatch" description="Start it when you sit down, pause for breaks, and log it when you’re done.">
      <div className="grid gap-5">
        <div>
          <label htmlFor="sw-subject" className="mb-1.5 block text-sm font-medium">
            Subject
          </label>
          <NativeSelect id="sw-subject" value={state.subjectId} onChange={(e) => writeStopwatch({ ...state, subjectId: e.target.value })}>
            <option value="">General study</option>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </NativeSelect>
        </div>

        <div
          className={cn(
            "rounded-xl border bg-surface-2/60 py-8 text-center transition-colors",
            state.running && "border-primary/40 bg-primary-soft",
          )}
        >
          <p className="font-mono text-[clamp(2.75rem,8vw,4.5rem)] leading-none font-semibold tracking-tight tabular" role="timer" aria-live="off" aria-label={`Elapsed ${clock}`}>
            {clock}
          </p>
          <p className="mt-2 text-xs font-medium text-muted-foreground" aria-live="polite">
            {state.running ? "Running" : hasTime ? "Paused" : "Ready"}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {state.running ? (
            <Button size="lg" variant="outline" className="h-10 flex-1" onClick={pause}>
              <Pause aria-hidden="true" /> Pause
            </Button>
          ) : (
            <Button size="lg" className="h-10 flex-1" onClick={play}>
              <Play aria-hidden="true" /> {hasTime ? "Resume" : "Start"}
            </Button>
          )}
          <Button size="lg" variant="secondary" className="h-10" onClick={finish} disabled={!hasTime || pending}>
            <Check aria-hidden="true" /> Finish & log
          </Button>
          <Button size="lg" variant="ghost" className="h-10" onClick={reset} disabled={!hasTime || pending} aria-label="Reset stopwatch">
            <RotateCcw aria-hidden="true" />
          </Button>
        </div>
      </div>
    </Panel>
  )
}
