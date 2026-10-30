"use client"

import { useState, useTransition } from "react"
import { Loader2, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { useShell } from "@/components/app/shell-context"
import { Panel } from "@/components/app/page-header"
import { FormField, FormMessage } from "@/components/forms/form-field"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { NativeSelect } from "@/components/ui/native-select"
import { deleteStudySession, logStudySession, saveStudyGoals } from "@/lib/data/planner-actions"
import { formatMinutes } from "@/lib/study/streak"

/** Log a session after the fact: subject, day, hours and minutes. */
export function LogSessionForm({ today }: { today: string }) {
  const { subjects } = useShell()
  const [subjectId, setSubjectId] = useState("")
  const [date, setDate] = useState(today)
  const [hours, setHours] = useState("0")
  const [mins, setMins] = useState("45")
  const [note, setNote] = useState("")
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState<string>()
  const [pending, start] = useTransition()

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const minutes = (Number(hours) || 0) * 60 + (Number(mins) || 0)
    start(async () => {
      const r = await logStudySession({ subjectId: subjectId || null, studiedOn: date, minutes, note: note || null })
      if (!r.ok) {
        setErrors(r.fieldErrors ?? {})
        setFormError(r.error)
        return
      }
      setErrors({})
      setFormError(undefined)
      setNote("")
      toast.success(`Logged ${formatMinutes(minutes)}`)
    })
  }

  return (
    <Panel title="Log a session" description="Studied without the stopwatch? Add it here.">
      <form onSubmit={submit} className="grid gap-4" noValidate>
        <FormMessage status="error" message={formError} />
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField id="ls-subject" label="Subject">
            {(p) => (
              <NativeSelect {...p} value={subjectId} onChange={(e) => setSubjectId(e.target.value)}>
                <option value="">General study</option>
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </NativeSelect>
            )}
          </FormField>
          <FormField id="ls-date" label="Day" error={errors.studiedOn}>
            {(p) => <Input {...p} type="date" max={today} value={date} onChange={(e) => setDate(e.target.value)} />}
          </FormField>
        </div>
        <fieldset>
          <legend className="mb-1.5 text-sm font-medium">How long</legend>
          <div className="grid grid-cols-2 gap-2">
            <label className="grid gap-1 text-xs text-muted-foreground">
              Hours
              <NativeSelect value={hours} onChange={(e) => setHours(e.target.value)} className="font-mono">
                {Array.from({ length: 13 }, (_, i) => (
                  <option key={i} value={i}>
                    {i}
                  </option>
                ))}
              </NativeSelect>
            </label>
            <label className="grid gap-1 text-xs text-muted-foreground">
              Minutes
              <NativeSelect value={mins} onChange={(e) => setMins(e.target.value)} className="font-mono">
                {Array.from({ length: 12 }, (_, i) => i * 5).map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </NativeSelect>
            </label>
          </div>
          {errors.minutes && <p className="mt-1 text-xs font-medium text-destructive">{errors.minutes}</p>}
        </fieldset>
        <FormField id="ls-note" label="Note" hint="Optional: what you worked on.">
          {(p) => <Input {...p} value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} placeholder="e.g. Past paper 2, question 3" />}
        </FormField>
        <Button type="submit" size="lg" className="h-10" disabled={pending}>
          {pending && <Loader2 className="animate-spin" aria-hidden="true" />} Log session
        </Button>
      </form>
    </Panel>
  )
}

const DAILY = [15, 30, 45, 60, 90, 120, 180, 240]

/** Daily goal drives the streak; the weekly goal drives the weekly progress bar. */
export function StudyGoalForm({ daily, weekly }: { daily: number; weekly: number }) {
  const [d, setD] = useState(String(daily))
  const [w, setW] = useState(String(weekly))
  const [pending, start] = useTransition()
  const options = DAILY.includes(daily) ? DAILY : [...DAILY, daily].sort((a, b) => a - b)
  return (
    <form
      className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end"
      onSubmit={(e) => {
        e.preventDefault()
        start(async () => {
          const r = await saveStudyGoals({ daily: Number(d), weekly: Number(w) })
          if (r.ok) toast.success("Study goals saved")
          else toast.error(r.error)
        })
      }}
    >
      <label className="grid gap-1.5 text-sm font-medium">
        Study every day for
        <NativeSelect value={d} onChange={(e) => setD(e.target.value)}>
          {options.map((m) => (
            <option key={m} value={m}>
              {formatMinutes(m)}
            </option>
          ))}
        </NativeSelect>
      </label>
      <label className="grid gap-1.5 text-sm font-medium">
        Weekly target
        <NativeSelect value={w} onChange={(e) => setW(e.target.value)}>
          {[0, 120, 180, 300, 420, 600, 840, 1200].map((m) => (
            <option key={m} value={m}>
              {m === 0 ? "No weekly target" : formatMinutes(m)}
            </option>
          ))}
        </NativeSelect>
      </label>
      <Button type="submit" className="h-9" disabled={pending}>
        Save goals
      </Button>
    </form>
  )
}

export function DeleteSessionButton({ id }: { id: string }) {
  const [pending, start] = useTransition()
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        start(async () => {
          const r = await deleteStudySession(id)
          if (!r.ok) toast.error(r.error)
        })
      }
      className="grid size-8 place-items-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-50"
      aria-label="Delete session"
    >
      <Trash2 className="size-3.5" aria-hidden="true" />
    </button>
  )
}
