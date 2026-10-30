import type { Metadata } from "next"
import { addDays, endOfMonth, endOfWeek, format, isValid, parseISO, startOfMonth, startOfWeek } from "date-fns"
import { PageHeader } from "@/components/app/page-header"
import { CalendarView, type CalendarMode } from "@/components/calendar/calendar-view"
import { requireUser } from "@/lib/auth/session"
import { getEvents, getWorkspace } from "@/lib/data/queries"

export const metadata: Metadata = { title: "Calendar" }

const fmt = (d: Date) => format(d, "yyyy-MM-dd")

export default async function CalendarPage({ searchParams }: PageProps<"/calendar">) {
  const sp = await searchParams
  const today = fmt(new Date())
  const parsed = typeof sp.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(sp.date) ? parseISO(sp.date) : null
  const anchor = parsed && isValid(parsed) ? parsed : new Date()
  const view: CalendarMode = sp.view === "week" || sp.view === "agenda" ? sp.view : "month"

  const ws = await getWorkspace()
  const weekStartsOn = ws.profile.week_start === 0 ? 0 : 1
  const [from, to] =
    view === "month"
      ? [startOfWeek(startOfMonth(anchor), { weekStartsOn }), endOfWeek(endOfMonth(anchor), { weekStartsOn })]
      : view === "week"
        ? [startOfWeek(anchor, { weekStartsOn }), endOfWeek(anchor, { weekStartsOn })]
        : [anchor, addDays(anchor, 60)]

  const { supabase } = await requireUser()
  const [events, { data: integration }] = await Promise.all([
    getEvents(fmt(addDays(from, -1)), fmt(addDays(to, 1))),
    supabase.from("integrations").select("status, last_synced_at, feed_host").eq("provider", "managebac").maybeSingle(),
  ])

  return (
    <>
      <PageHeader title="Calendar" description="Assessments, ManageBac deadlines and your own study plans in one place." />
      <CalendarView
        events={events}
        date={fmt(anchor)}
        view={view}
        today={today}
        integration={{
          connected: Boolean(integration?.feed_host),
          lastSyncedAt: integration?.last_synced_at ?? null,
          status: integration?.status ?? "disconnected",
        }}
      />
    </>
  )
}
