"use client"

import { useMemo, useOptimistic, useState, useTransition } from "react"
import { format, parseISO } from "date-fns"
import { CalendarDays, Flag, Loader2, Plus, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { useShell } from "@/components/app/shell-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { NativeSelect } from "@/components/ui/native-select"
import { clearCompletedTodos, deleteTodo, saveTodo, setTodoDone } from "@/lib/data/planner-actions"
import type { Todo } from "@/lib/data/types"
import { cn } from "@/lib/utils"

const PRIORITY = [
  { v: 0, label: "Low", cls: "text-muted-foreground" },
  { v: 1, label: "Normal", cls: "text-primary" },
  { v: 2, label: "High", cls: "text-decline-text" },
]

type Group = { id: string; title: string; items: Todo[] }

export function TodoBoard({ todos, today }: { todos: Todo[]; today: string }) {
  const { subjects } = useShell()
  const byId = useMemo(() => new Map(subjects.map((s) => [s.id, s])), [subjects])
  const [optimistic, setOptimistic] = useOptimistic(todos, (state, patch: { id: string; done?: boolean; remove?: boolean }) =>
    patch.remove
      ? state.filter((t) => t.id !== patch.id)
      : state.map((t) => (t.id === patch.id ? { ...t, done_at: patch.done ? new Date().toISOString() : null } : t)),
  )
  const [title, setTitle] = useState("")
  const [due, setDue] = useState("")
  const [subjectId, setSubjectId] = useState("")
  const [priority, setPriority] = useState(1)
  const [showDone, setShowDone] = useState(false)
  const [pending, start] = useTransition()

  const open = optimistic.filter((t) => !t.done_at)
  const done = optimistic.filter((t) => t.done_at)
  const groups: Group[] = [
    { id: "overdue", title: "Overdue", items: open.filter((t) => t.due_on && t.due_on < today) },
    { id: "today", title: "Today", items: open.filter((t) => t.due_on === today) },
    { id: "upcoming", title: "Upcoming", items: open.filter((t) => t.due_on && t.due_on > today) },
    { id: "someday", title: "No date", items: open.filter((t) => !t.due_on) },
  ].filter((g) => g.items.length > 0)

  const add = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return
    start(async () => {
      const r = await saveTodo({ title, dueOn: due || null, subjectId: subjectId || null, priority })
      if (!r.ok) return void toast.error(r.fieldErrors?.title ?? r.error)
      setTitle("")
      setDue("")
    })
  }

  const toggle = (t: Todo) =>
    start(async () => {
      setOptimistic({ id: t.id, done: !t.done_at })
      const r = await setTodoDone(t.id, !t.done_at)
      if (!r.ok) toast.error(r.error)
      else if (!t.done_at)
        toast.success(`Done: ${t.title}`, {
          action: { label: "Undo", onClick: () => start(async () => void (await setTodoDone(t.id, false))) },
        })
    })

  const remove = (t: Todo) =>
    start(async () => {
      setOptimistic({ id: t.id, remove: true })
      const r = await deleteTodo(t.id)
      if (!r.ok) toast.error(r.error)
    })

  const row = (t: Todo) => {
    const s = t.subject_id ? byId.get(t.subject_id) : undefined
    const p = PRIORITY[t.priority] ?? PRIORITY[1]
    const overdue = !t.done_at && t.due_on && t.due_on < today
    return (
      <li key={t.id} className="group flex items-center gap-3 px-4 py-3">
        <input
          type="checkbox"
          checked={Boolean(t.done_at)}
          onChange={() => toggle(t)}
          aria-label={`Mark “${t.title}” ${t.done_at ? "not done" : "done"}`}
          className="size-5 shrink-0 cursor-pointer rounded accent-[var(--primary)]"
        />
        <div className="min-w-0 flex-1">
          <p className={cn("truncate text-sm font-medium", t.done_at && "text-muted-foreground line-through")}>{t.title}</p>
          <p className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
            {t.due_on && (
              <span className={cn("inline-flex items-center gap-1", overdue && "font-medium text-decline-text")}>
                <CalendarDays className="size-3" aria-hidden="true" />
                {t.due_on === today ? "Today" : format(parseISO(t.due_on), "EEE d MMM")}
              </span>
            )}
            {s && (
              <span className="inline-flex items-center gap-1.5">
                <span className="size-1.5 rounded-full" style={{ backgroundColor: s.color }} aria-hidden="true" />
                {s.name}
              </span>
            )}
            {t.priority !== 1 && (
              <span className={cn("inline-flex items-center gap-1", p.cls)}>
                <Flag className="size-3" aria-hidden="true" /> {p.label}
              </span>
            )}
          </p>
        </div>
        <button
          type="button"
          onClick={() => remove(t)}
          className="grid size-8 place-items-center rounded-md text-muted-foreground opacity-60 hover:bg-accent hover:text-foreground focus-visible:opacity-100 group-hover:opacity-100"
          aria-label={`Delete “${t.title}”`}
        >
          <Trash2 className="size-3.5" aria-hidden="true" />
        </button>
      </li>
    )
  }

  return (
    <div className="space-y-6">
      <form onSubmit={add} className="rounded-[var(--radius-card)] border bg-card p-4 shadow-card">
        <label htmlFor="todo-title" className="sr-only">
          New task
        </label>
        <div className="flex gap-2">
          <Input id="todo-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Add a task, e.g. Finish chemistry lab write-up" maxLength={200} size="lg" leftIcon={<Plus />} />
          <Button type="submit" size="lg" className="h-10 px-4" disabled={pending || !title.trim()}>
            {pending ? <Loader2 className="animate-spin" aria-hidden="true" /> : "Add"}
          </Button>
        </div>
        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          <label className="grid gap-1 text-xs text-muted-foreground">
            Due
            <Input type="date" value={due} onChange={(e) => setDue(e.target.value)} />
          </label>
          <label className="grid gap-1 text-xs text-muted-foreground">
            Subject
            <NativeSelect value={subjectId} onChange={(e) => setSubjectId(e.target.value)}>
              <option value="">None</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </NativeSelect>
          </label>
          <label className="grid gap-1 text-xs text-muted-foreground">
            Priority
            <NativeSelect value={priority} onChange={(e) => setPriority(Number(e.target.value))}>
              {PRIORITY.map((p) => (
                <option key={p.v} value={p.v}>
                  {p.label}
                </option>
              ))}
            </NativeSelect>
          </label>
        </div>
      </form>

      {groups.length === 0 ? (
        <p className="rounded-[var(--radius-card)] border border-dashed py-12 text-center text-sm text-muted-foreground" role="status">
          {done.length ? "All done. Nice work." : "Nothing to do yet. Add your first task above."}
        </p>
      ) : (
        groups.map((g) => (
          <section key={g.id} aria-labelledby={`todo-${g.id}`}>
            <h2 id={`todo-${g.id}`} className={cn("mb-2 text-sm font-semibold", g.id === "overdue" && "text-decline-text")}>
              {g.title} <span className="font-mono font-normal text-muted-foreground tabular">{g.items.length}</span>
            </h2>
            <ul className="divide-y rounded-[var(--radius-card)] border bg-card shadow-card">{g.items.map(row)}</ul>
          </section>
        ))
      )}

      {done.length > 0 && (
        <section aria-labelledby="todo-done">
          <div className="mb-2 flex items-center justify-between">
            <button type="button" id="todo-done" onClick={() => setShowDone((v) => !v)} aria-expanded={showDone} className="text-sm font-semibold text-muted-foreground hover:text-foreground">
              Completed <span className="font-mono font-normal tabular">{done.length}</span> {showDone ? "▾" : "▸"}
            </button>
            {showDone && (
              <button
                type="button"
                onClick={() =>
                  start(async () => {
                    const r = await clearCompletedTodos()
                    if (!r.ok) toast.error(r.error)
                  })
                }
                className="text-xs font-medium text-muted-foreground hover:text-foreground"
              >
                Clear completed
              </button>
            )}
          </div>
          {showDone && <ul className="divide-y rounded-[var(--radius-card)] border bg-card opacity-80">{done.map(row)}</ul>}
        </section>
      )}
    </div>
  )
}
