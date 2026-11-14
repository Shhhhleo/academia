"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useMemo, useState, useTransition } from "react"
import { addDays, addMonths, addWeeks, format, formatDistanceToNow, isSameMonth, parseISO, startOfWeek } from "date-fns"
import { ChevronLeft, ChevronRight, Link2, Loader2, Plus, RefreshCw } from "lucide-react"
import { toast } from "sonner"
import { useShell } from "@/components/app/shell-context"
import { Button } from "@/components/ui/button"
import type { CalendarEvent } from "@/lib/data/types"
import { syncManageBacNow } from "@/lib/managebac/actions"
import { cn } from "@/lib/utils"
import { AgendaList } from "./agenda-list"
import { DayListDialog, EventFormDialog, ItemDetailsDialog } from "./event-dialogs"
import { buildItems, type CalItem, type ItemSource } from "./items"
import { MonthGrid, monthGridDays } from "./month-grid"
import { WeekGrid } from "./week-grid"

export type CalendarMode = "month" | "week" | "agenda"

export function CalendarView({
  events,
  date,
  view,
  today,
  integration,
}: {
  events: CalendarEvent[]
  date: string
  view: CalendarMode
  today: string
  integration: { connected: boolean; lastSyncedAt: string | null; status: string }
}) {
  const { subjects, profile } = useShell()
  const router = useRouter()
  const pathname = usePathname()
  const anchor = parseISO(date)
  const weekStartsOn = (profile.week_start === 0 ? 0 : 1) as 0 | 1
  const [focused, setFocused] = useState(date)
  const [hiddenSubjects, setHiddenSubjects] = useState<Set<string>>(new Set())
  const [hiddenSources, setHiddenSources] = useState<Set<ItemSource>>(new Set())
  const [open, setOpen] = useState<CalItem | null>(null)
  const [dayList, setDayList] = useState<string | null>(null)
  const [form, setForm] = useState<{ date?: string; event?: CalendarEvent } | null>(null)
  const [syncing, startSync] = useTransition()

  const all = useMemo(() => buildItems(subjects, events), [subjects, events])
  const items = all.filter((i) => !hiddenSources.has(i.source) && !(i.subjectId && hiddenSubjects.has(i.subjectId)))

  const go = (nextDate: Date | string, nextView: CalendarMode = view) => {
    const d = typeof nextDate === "string" ? nextDate : format(nextDate, "yyyy-MM-dd")
    router.push(`${pathname}?view=${nextView}&date=${d}`, { scroll: false })
  }

  const sync = () =>
    startSync(async () => {
      const r = await syncManageBacNow()
      if (!r.ok) {
        toast.error(r.error)
        return
      }
      toast.success(r.added ? `Synced ManageBac: ${r.added} new` : "ManageBac is up to date")
      router.refresh()
    })


  const step = (dir: 1 | -1) => go(view === "month" ? addMonths(anchor, dir) : view === "week" ? addWeeks(anchor, dir) : addDays(anchor, dir * 30))
  const title =
    view === "week"
      ? `${format(startOfWeek(anchor, { weekStartsOn }), "d MMM")} – ${format(addDays(startOfWeek(anchor, { weekStartsOn }), 6), "d MMM yyyy")}`
      : format(anchor, "MMMM yyyy")

  const toggle = <T,>(set: Set<T>, v: T) => {
    const n = new Set(set)
    if (n.has(v)) n.delete(v)
    else n.add(v)
    return n
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[15rem_1fr]">
      <aside className="order-2 space-y-6 lg:order-1" aria-label="Calendar options">
        <Button className="w-full" size="lg" onClick={() => setForm({ date: focused })}>
          <Plus aria-hidden="true" /> New event
        </Button>
        <MiniMonth key={date} anchor={anchor} today={today} weekStartsOn={weekStartsOn} selected={date} onPick={(d) => go(d)} />

        <fieldset className="space-y-1.5">
          <legend className="mb-2 text-xs font-medium text-muted-foreground">Show</legend>
          {(
            [
              ["assessment", "Assessments"],
              ["managebac", "ManageBac"],
              ["google", "Google Calendar"],
              ["manual", "My events"],
            ] as const
          ).map(([k, label]) => (
            <label key={k} className="flex cursor-pointer items-center gap-2.5 rounded-md px-1 py-1 text-sm hover:bg-accent">
              <input type="checkbox" checked={!hiddenSources.has(k)} onChange={() => setHiddenSources((s) => toggle(s, k))} className="size-4 accent-[var(--primary)]" />
              {label}
            </label>
          ))}
        </fieldset>

        {subjects.length > 0 && (
          <fieldset className="space-y-1.5">
            <legend className="mb-2 text-xs font-medium text-muted-foreground">Subjects</legend>
            {subjects.map((s) => (
              <label key={s.id} className="flex cursor-pointer items-center gap-2.5 rounded-md px-1 py-1 text-sm hover:bg-accent">
                <input
                  type="checkbox"
                  checked={!hiddenSubjects.has(s.id)}
                  onChange={() => setHiddenSubjects((h) => toggle(h, s.id))}
                  className="size-4"
                  style={{ accentColor: s.color }}
                />
                <span className="truncate">{s.name}</span>
              </label>
            ))}
          </fieldset>
        )}

        <div className="rounded-[var(--radius-card)] border bg-card p-4 text-sm shadow-card">
          <p className="flex items-center gap-2 font-medium">
            <Link2 className="size-4 text-primary" aria-hidden="true" /> ManageBac
          </p>
          {integration.connected ? (
            <>
              <p className="mt-1 text-xs text-muted-foreground">
                {integration.status === "error"
                  ? "Last sync failed."
                  : integration.lastSyncedAt
                    ? `Synced ${formatDistanceToNow(new Date(integration.lastSyncedAt), { addSuffix: true })}`
                    : "Not synced yet"}
              </p>
              <Button variant="outline" className="mt-3 w-full" onClick={() => sync()} disabled={syncing}>
                {syncing ? <Loader2 className="animate-spin" aria-hidden="true" /> : <RefreshCw aria-hidden="true" />} Sync now
              </Button>
            </>
          ) : (
            <p className="mt-1 text-xs text-muted-foreground">
              <Link href="/integrations/managebac" className="font-medium text-primary hover:underline">
                Connect your calendar
              </Link>{" "}
              to pull in deadlines automatically.
            </p>
          )}
        </div>
      </aside>

      <section className="order-1 min-w-0 lg:order-2" aria-label="Calendar">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <Button variant="outline" onClick={() => go(today)}>
            Today
          </Button>
          <div className="flex">
            <button type="button" onClick={() => step(-1)} className="grid size-8 place-items-center rounded-lg hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none" aria-label="Previous">
              <ChevronLeft className="size-4" aria-hidden="true" />
            </button>
            <button type="button" onClick={() => step(1)} className="grid size-8 place-items-center rounded-lg hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none" aria-label="Next">
              <ChevronRight className="size-4" aria-hidden="true" />
            </button>
          </div>
          <h2 className="mr-auto font-display text-xl font-semibold" aria-live="polite">
            {title}
          </h2>
          <div className="inline-flex rounded-lg border bg-muted p-0.5" role="group" aria-label="Calendar view">
            {(["month", "week", "agenda"] as const).map((v) => (
              <button
                key={v}
                type="button"
                aria-pressed={view === v}
                onClick={() => go(anchor, v)}
                className={cn("h-7 rounded-md px-3 text-xs font-medium capitalize text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none", view === v && "bg-card text-foreground shadow-sm")}
              >
                {v}
              </button>
            ))}
          </div>
        </div>

        {view === "month" && (
          <MonthGrid
            anchor={anchor}
            focused={focused}
            onFocusDate={(d) => {
              setFocused(d)
              if (!isSameMonth(parseISO(d), anchor)) go(d)
            }}
            items={items}
            weekStartsOn={weekStartsOn}
            today={today}
            onCreate={(d) => setForm({ date: d })}
            onOpen={setOpen}
            onMore={setDayList}
          />
        )}
        {view === "week" && <WeekGrid anchor={anchor} items={items} weekStartsOn={weekStartsOn} today={today} onCreate={(d) => setForm({ date: d })} onOpen={setOpen} />}
        {view === "agenda" && <AgendaList items={items} from={date} onOpen={setOpen} />}
        <p className="mt-3 text-xs text-muted-foreground">Tip: use arrow keys to move between days and Enter to add an event. Double-click a day to add one too.</p>
      </section>

      <ItemDetailsDialog
        item={open}
        onClose={() => setOpen(null)}
        onEdit={(e) => {
          setOpen(null)
          setForm({ event: e })
        }}
      />
      <DayListDialog
        date={dayList}
        items={items.filter((i) => i.date === dayList)}
        onClose={() => setDayList(null)}
        onOpen={(i) => {
          setDayList(null)
          setOpen(i)
        }}
      />
      <EventFormDialog state={form} onClose={() => setForm(null)} />
    </div>
  )
}

function MiniMonth({ anchor, today, selected, weekStartsOn, onPick }: { anchor: Date; today: string; selected: string; weekStartsOn: 0 | 1; onPick: (d: string) => void }) {
  const [month, setMonth] = useState(anchor)
  const days = monthGridDays(month, weekStartsOn)
  return (
    <div className="rounded-[var(--radius-card)] border bg-card p-3 shadow-card">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-semibold">{format(month, "MMMM yyyy")}</span>
        <div className="flex">
          <button type="button" onClick={() => setMonth((m) => addMonths(m, -1))} className="grid size-6 place-items-center rounded hover:bg-accent" aria-label="Previous month">
            <ChevronLeft className="size-3.5" aria-hidden="true" />
          </button>
          <button type="button" onClick={() => setMonth((m) => addMonths(m, 1))} className="grid size-6 place-items-center rounded hover:bg-accent" aria-label="Next month">
            <ChevronRight className="size-3.5" aria-hidden="true" />
          </button>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-y-0.5 text-center">
        {days.slice(0, 7).map((d) => (
          <span key={d.toISOString()} className="text-[10px] text-muted-foreground" aria-hidden="true">
            {format(d, "EEEEE")}
          </span>
        ))}
        {days.map((d) => {
          const iso = format(d, "yyyy-MM-dd")
          return (
            <button
              key={iso}
              type="button"
              onClick={() => onPick(iso)}
              aria-label={format(d, "EEEE d MMMM yyyy")}
              aria-current={iso === today ? "date" : undefined}
              className={cn(
                "mx-auto grid size-7 place-items-center rounded-full font-mono text-[11px] tabular hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                !isSameMonth(d, month) && "text-muted-foreground/50",
                iso === selected && "bg-primary-soft font-semibold text-primary",
                iso === today && "bg-primary text-primary-foreground hover:bg-primary",
              )}
            >
              {format(d, "d")}
            </button>
          )
        })}
      </div>
    </div>
  )
}
