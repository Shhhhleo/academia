"use client"

import Link from "next/link"
import { useState, useTransition } from "react"
import { format, parseISO } from "date-fns"
import { CalendarClock, Link2, Loader2, Pencil, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { useShell } from "@/components/app/shell-context"
import { FormField, FormMessage } from "@/components/forms/form-field"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { NativeSelect } from "@/components/ui/native-select"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { deleteEvent, saveEvent } from "@/lib/data/calendar-actions"
import { EVENT_KINDS, KIND_LABEL } from "@/lib/data/schemas"
import type { CalendarEvent } from "@/lib/data/types"
import { ItemChip } from "./item-chip"
import type { CalItem } from "./items"

const EVENT_LABEL: Record<(typeof EVENT_KINDS)[number], string> = { deadline: "Deadline", exam: "Exam", event: "Event", study: "Study session" }

export function ItemDetailsDialog({ item, onClose, onEdit }: { item: CalItem | null; onClose: () => void; onEdit: (e: CalendarEvent) => void }) {
  const [pending, start] = useTransition()
  if (!item) return null
  const when = item.allDay ? format(parseISO(item.date), "EEEE d MMMM yyyy") : `${format(item.start!, "EEEE d MMMM, HH:mm")}${item.end ? `–${format(item.end, "HH:mm")}` : ""}`
  const kindLabel = item.source === "assessment" ? KIND_LABEL[item.kind as keyof typeof KIND_LABEL] : EVENT_LABEL[item.kind as keyof typeof EVENT_LABEL]

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="size-3 shrink-0 rounded-full" style={{ backgroundColor: item.color ?? "var(--muted-foreground)" }} aria-hidden="true" />
            {item.title}
          </DialogTitle>
          <DialogDescription>{when}</DialogDescription>
        </DialogHeader>
        <dl className="grid grid-cols-[6rem_1fr] gap-y-2 text-sm">
          <dt className="text-muted-foreground">Type</dt>
          <dd>
            {kindLabel ?? item.kind}
            {item.status && ` · ${item.status === "graded" ? "Graded" : "Upcoming"}`}
          </dd>
          {item.subjectName && (
            <>
              <dt className="text-muted-foreground">Subject</dt>
              <dd>{item.subjectName}</dd>
            </>
          )}
          <dt className="text-muted-foreground">Source</dt>
          <dd className="inline-flex items-center gap-1">
            {item.source === "managebac" ? (
              <>
                <Link2 className="size-3.5" aria-hidden="true" /> ManageBac (read-only)
              </>
            ) : item.source === "assessment" ? (
              "Assessment"
            ) : (
              <>
                <CalendarClock className="size-3.5" aria-hidden="true" /> My calendar
              </>
            )}
          </dd>
        </dl>
        {item.description && <p className="rounded-lg bg-muted px-3 py-2 text-sm whitespace-pre-line">{item.description}</p>}
        <div className="flex justify-end gap-2 border-t pt-4">
          {item.source === "assessment" && item.subjectId && (
            <Link href={`/subjects/${item.subjectId}#assessment-${item.assessmentId}`} onClick={onClose} className="inline-flex h-8 items-center rounded-lg border px-3 text-sm font-medium hover:bg-accent">
              Open in subject
            </Link>
          )}
          {item.source === "manual" && item.event && (
            <>
              <Button
                variant="destructive"
                disabled={pending}
                onClick={() =>
                  start(async () => {
                    const r = await deleteEvent(item.event!.id)
                    if (!r.ok) return void toast.error(r.error)
                    toast.success("Event deleted")
                    onClose()
                  })
                }
              >
                <Trash2 aria-hidden="true" /> Delete
              </Button>
              <Button variant="outline" onClick={() => onEdit(item.event!)}>
                <Pencil aria-hidden="true" /> Edit
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

export function DayListDialog({ date, items, onClose, onOpen }: { date: string | null; items: CalItem[]; onClose: () => void; onOpen: (i: CalItem) => void }) {
  if (!date) return null
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{format(parseISO(date), "EEEE d MMMM")}</DialogTitle>
          <DialogDescription>{items.length} items</DialogDescription>
        </DialogHeader>
        <ul className="space-y-1">
          {items.map((it) => (
            <li key={it.key}>
              <ItemChip item={it} onOpen={onOpen} />
            </li>
          ))}
        </ul>
      </DialogContent>
    </Dialog>
  )
}

const toLocalInput = (iso: string) => format(new Date(iso), "yyyy-MM-dd'T'HH:mm")

export function EventFormDialog({ state, onClose }: { state: { date?: string; event?: CalendarEvent } | null; onClose: () => void }) {
  if (!state) return null
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{state.event ? "Edit event" : "New event"}</DialogTitle>
          <DialogDescription>Personal events stay in Academia. They aren’t sent to ManageBac.</DialogDescription>
        </DialogHeader>
        <EventForm initial={state.event} date={state.date} onDone={onClose} />
      </DialogContent>
    </Dialog>
  )
}

function EventForm({ initial, date, onDone }: { initial?: CalendarEvent; date?: string; onDone: () => void }) {
  const { subjects } = useShell()
  const [title, setTitle] = useState(initial?.title ?? "")
  const [kind, setKind] = useState<(typeof EVENT_KINDS)[number]>(initial?.kind ?? "study")
  const [subjectId, setSubjectId] = useState(initial?.subject_id ?? "")
  const [allDay, setAllDay] = useState(initial?.all_day ?? true)
  const [day, setDay] = useState(initial?.starts_on ?? date ?? format(new Date(), "yyyy-MM-dd"))
  const [startsAt, setStartsAt] = useState(initial?.starts_at ? toLocalInput(initial.starts_at) : `${date ?? format(new Date(), "yyyy-MM-dd")}T16:00`)
  const [endsAt, setEndsAt] = useState(initial?.ends_at ? toLocalInput(initial.ends_at) : `${date ?? format(new Date(), "yyyy-MM-dd")}T17:00`)
  const [description, setDescription] = useState(initial?.description ?? "")
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState<string>()
  const [pending, start] = useTransition()

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    start(async () => {
      const r = await saveEvent({
        id: initial?.id,
        title,
        kind,
        subjectId: subjectId || null,
        allDay,
        startsOn: allDay ? day : null,
        startsAt: allDay ? null : new Date(startsAt).toISOString(),
        endsAt: allDay || !endsAt ? null : new Date(endsAt).toISOString(),
        description: description || null,
      })
      if (!r.ok) {
        setErrors(r.fieldErrors ?? {})
        setFormError(r.error)
        return
      }
      toast.success(initial ? "Event updated" : "Event added")
      onDone()
    })
  }

  return (
    <form onSubmit={submit} className="grid gap-4" noValidate>
      <FormMessage status="error" message={formError} />
      <FormField id="ev-title" label="Title" error={errors.title} required>
        {(p) => <Input {...p} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Revise chemistry" maxLength={200} autoFocus />}
      </FormField>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField id="ev-kind" label="Type">
          {(p) => (
            <NativeSelect {...p} value={kind} onChange={(e) => setKind(e.target.value as typeof kind)}>
              {EVENT_KINDS.map((k) => (
                <option key={k} value={k}>
                  {EVENT_LABEL[k]}
                </option>
              ))}
            </NativeSelect>
          )}
        </FormField>
        <FormField id="ev-subject" label="Subject">
          {(p) => (
            <NativeSelect {...p} value={subjectId} onChange={(e) => setSubjectId(e.target.value)}>
              <option value="">None</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </NativeSelect>
          )}
        </FormField>
      </div>
      <label className="flex items-center justify-between rounded-lg border bg-field px-3 py-2.5 text-sm font-medium">
        All day
        <Switch checked={allDay} onCheckedChange={(v) => setAllDay(Boolean(v))} aria-label="All day" />
      </label>
      {allDay ? (
        <FormField id="ev-day" label="Date" error={errors.startsOn}>
          {(p) => <Input {...p} type="date" value={day} onChange={(e) => setDay(e.target.value)} />}
        </FormField>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField id="ev-start" label="Starts" error={errors.startsAt}>
            {(p) => <Input {...p} type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} />}
          </FormField>
          <FormField id="ev-end" label="Ends" error={errors.endsAt}>
            {(p) => <Input {...p} type="datetime-local" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} />}
          </FormField>
        </div>
      )}
      <FormField id="ev-desc" label="Notes">
        {(p) => <Textarea {...p} value={description} onChange={(e) => setDescription(e.target.value)} rows={2} maxLength={4000} />}
      </FormField>
      <div className="flex justify-end border-t pt-4">
        <Button type="submit" size="lg" className="px-4" disabled={pending}>
          {pending && <Loader2 className="animate-spin" aria-hidden="true" />}
          {initial ? "Save event" : "Add event"}
        </Button>
      </div>
    </form>
  )
}
