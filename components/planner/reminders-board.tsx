"use client"

import { useState, useSyncExternalStore, useTransition } from "react"
import { format } from "date-fns"
import { AlarmClock, BellOff, BellRing, Check, Loader2, Trash2, Undo2 } from "lucide-react"
import { toast } from "sonner"
import { useShell } from "@/components/app/shell-context"
import { Panel } from "@/components/app/page-header"
import { FormMessage } from "@/components/forms/form-field"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { NativeSelect } from "@/components/ui/native-select"
import { Switch } from "@/components/ui/switch"
import { deleteReminder, saveBriefSettings, saveReminder, setReminderDone } from "@/lib/data/planner-actions"
import type { Reminder } from "@/lib/data/types"
import { cn } from "@/lib/utils"

export function ReminderForm({ today }: { today: string }) {
  const { subjects } = useShell()
  const [title, setTitle] = useState("")
  const [date, setDate] = useState(today)
  const [time, setTime] = useState("17:00")
  const [subjectId, setSubjectId] = useState("")
  const [error, setError] = useState<string>()
  const [pending, start] = useTransition()

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const at = new Date(`${date}T${time}`)
    if (Number.isNaN(at.getTime())) return setError("Pick a valid date and time.")
    start(async () => {
      const r = await saveReminder({ title, remindAt: at.toISOString(), subjectId: subjectId || null })
      if (!r.ok) return setError(r.fieldErrors?.title ?? r.error)
      setError(undefined)
      setTitle("")
      toast.success(`Reminder set for ${format(at, "EEE d MMM, HH:mm")}`)
    })
  }

  return (
    <Panel title="New reminder">
      <form onSubmit={submit} className="grid gap-3" noValidate>
        <FormMessage status="error" message={error} />
        <label htmlFor="rm-title" className="text-sm font-medium">
          Remind me to
        </label>
        <Input id="rm-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Bring my calculator for the maths test" maxLength={200} />
        <div className="grid grid-cols-2 gap-2">
          <label className="grid gap-1 text-xs text-muted-foreground">
            Date
            <Input type="date" value={date} min={today} onChange={(e) => setDate(e.target.value)} />
          </label>
          <label className="grid gap-1 text-xs text-muted-foreground">
            Time
            <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
          </label>
        </div>
        <label className="grid gap-1 text-xs text-muted-foreground">
          Subject (optional)
          <NativeSelect value={subjectId} onChange={(e) => setSubjectId(e.target.value)}>
            <option value="">None</option>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </NativeSelect>
        </label>
        <Button type="submit" size="lg" className="h-10" disabled={pending || !title.trim()}>
          {pending ? <Loader2 className="animate-spin" aria-hidden="true" /> : <AlarmClock aria-hidden="true" />} Set reminder
        </Button>
      </form>
    </Panel>
  )
}

export function ReminderList({ reminders, now }: { reminders: Reminder[]; now: number }) {
  const { subjects } = useShell()
  const byId = new Map(subjects.map((s) => [s.id, s]))
  const [pending, start] = useTransition()
  const upcoming = reminders.filter((r) => !r.done_at && new Date(r.remind_at).getTime() >= now - 60_000)
  const past = reminders.filter((r) => r.done_at || new Date(r.remind_at).getTime() < now - 60_000)

  const item = (r: Reminder) => {
    const s = r.subject_id ? byId.get(r.subject_id) : undefined
    const at = new Date(r.remind_at)
    return (
      <li key={r.id} className="flex items-center gap-3 px-4 py-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-muted font-mono text-[11px] leading-tight text-muted-foreground tabular">
          {format(at, "HH:mm")}
        </span>
        <div className="min-w-0 flex-1">
          <p className={cn("truncate text-sm font-medium", r.done_at && "text-muted-foreground line-through")}>{r.title}</p>
          <p className="truncate text-xs text-muted-foreground">
            {format(at, "EEE d MMM")}
            {s && ` · ${s.name}`}
          </p>
        </div>
        <button
          type="button"
          disabled={pending}
          onClick={() => start(async () => void (await setReminderDone(r.id, !r.done_at)))}
          className="grid size-8 place-items-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
          aria-label={r.done_at ? `Mark “${r.title}” as not done` : `Mark “${r.title}” as done`}
        >
          {r.done_at ? <Undo2 className="size-3.5" aria-hidden="true" /> : <Check className="size-4" aria-hidden="true" />}
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => start(async () => void (await deleteReminder(r.id)))}
          className="grid size-8 place-items-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
          aria-label={`Delete “${r.title}”`}
        >
          <Trash2 className="size-3.5" aria-hidden="true" />
        </button>
      </li>
    )
  }

  return (
    <div className="space-y-6">
      <section aria-labelledby="rm-up">
        <h2 id="rm-up" className="mb-2 text-sm font-semibold">
          Upcoming <span className="font-mono font-normal text-muted-foreground tabular">{upcoming.length}</span>
        </h2>
        {upcoming.length ? (
          <ul className="divide-y rounded-[var(--radius-card)] border bg-card shadow-card">{upcoming.map(item)}</ul>
        ) : (
          <p className="rounded-[var(--radius-card)] border border-dashed py-10 text-center text-sm text-muted-foreground">No upcoming reminders.</p>
        )}
      </section>
      {past.length > 0 && (
        <section aria-labelledby="rm-past">
          <h2 id="rm-past" className="mb-2 text-sm font-semibold text-muted-foreground">
            Past and done
          </h2>
          <ul className="divide-y rounded-[var(--radius-card)] border bg-card opacity-80">{past.slice(0, 20).map(item)}</ul>
        </section>
      )}
    </div>
  )
}

const subscribePermission = (cb: () => void) => {
  window.addEventListener("focus", cb)
  return () => window.removeEventListener("focus", cb)
}
const readPermission = () => (typeof Notification === "undefined" ? "unsupported" : Notification.permission)

export function BriefSettings() {
  const { profile } = useShell()
  const [enabled, setEnabled] = useState(profile.brief_enabled)
  const [time, setTime] = useState(profile.brief_time.slice(0, 5))
  const [days, setDays] = useState(String(profile.brief_days))
  const [timezone, setTimezone] = useState(profile.timezone)
  const [pending, start] = useTransition()
  const permission = useSyncExternalStore(subscribePermission, readPermission, () => "default")
  const [, force] = useState(0)

  const browserTz = typeof Intl !== "undefined" ? Intl.DateTimeFormat().resolvedOptions().timeZone : "UTC"

  return (
    <Panel title="Daily brief" description="A summary of reminders, tasks, assessments and events for the next few days, ready at the time you choose.">
      <form
        id="brief-settings"
        className="grid scroll-mt-24 gap-4"
        onSubmit={(e) => {
          e.preventDefault()
          start(async () => {
            const r = await saveBriefSettings({ enabled, time, days: Number(days), timezone })
            if (r.ok) toast.success("Daily brief saved")
            else toast.error(r.fieldErrors?.timezone ?? r.fieldErrors?.time ?? r.error)
          })
        }}
      >
        <label className="flex items-center justify-between gap-4 rounded-lg border bg-field px-3 py-2.5">
          <span className="text-sm font-medium">Send me a daily brief</span>
          <Switch checked={enabled} onCheckedChange={(v) => setEnabled(Boolean(v))} aria-label="Send me a daily brief" />
        </label>
        <div className="grid grid-cols-2 gap-2">
          <label className="grid gap-1 text-xs text-muted-foreground">
            Time
            <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} disabled={!enabled} />
          </label>
          <label className="grid gap-1 text-xs text-muted-foreground">
            Look ahead
            <NativeSelect value={days} onChange={(e) => setDays(e.target.value)} disabled={!enabled}>
              {[1, 3, 5, 7].map((d) => (
                <option key={d} value={d}>
                  {d === 1 ? "Today only" : `${d} days`}
                </option>
              ))}
            </NativeSelect>
          </label>
        </div>
        <div className="grid gap-1 text-xs text-muted-foreground">
          <span>Time zone</span>
          <div className="flex items-center gap-2">
            <span className="flex-1 truncate rounded-ele border bg-field px-3 py-2 font-mono text-sm text-foreground">{timezone}</span>
            {browserTz !== timezone && (
              <Button type="button" variant="outline" onClick={() => setTimezone(browserTz)}>
                Use {browserTz}
              </Button>
            )}
          </div>
        </div>
        <Button type="submit" disabled={pending}>
          Save brief settings
        </Button>
      </form>

      <div className="mt-5 rounded-lg border bg-surface-2/60 p-3 text-sm">
        {permission === "granted" ? (
          <p className="flex items-center gap-2 text-success-text">
            <BellRing className="size-4" aria-hidden="true" /> Desktop notifications are on.
          </p>
        ) : permission === "denied" ? (
          <p className="flex items-center gap-2 text-muted-foreground">
            <BellOff className="size-4" aria-hidden="true" /> Notifications are blocked in your browser settings for this site.
          </p>
        ) : permission === "unsupported" ? (
          <p className="text-muted-foreground">This browser doesn’t support notifications. You’ll still see in-app alerts.</p>
        ) : (
          <div className="flex items-center justify-between gap-3">
            <p className="text-muted-foreground">Get a pop-up for reminders and your brief, even when Academia is in another tab.</p>
            <Button
              type="button"
              variant="outline"
              onClick={async () => {
                await Notification.requestPermission()
                force((n) => n + 1)
              }}
            >
              Turn on
            </Button>
          </div>
        )}
        <p className="mt-2 text-xs text-muted-foreground">Alerts appear while Academia is open in a browser tab.</p>
      </div>
    </Panel>
  )
}
