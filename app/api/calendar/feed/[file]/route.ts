import { createClient } from "@supabase/supabase-js"
import { NextResponse, type NextRequest } from "next/server"
import { buildIcs, type ExportItem } from "@/lib/calendar/ics-export"
import type { Database } from "@/lib/supabase/database.types"
import { supabaseEnv } from "@/lib/supabase/env"

type Feed = {
  assessments: { id: string; title: string; kind: string; status: string; due_on: string; subject: string }[]
  events: { id: string; title: string; all_day: boolean; starts_on: string | null; starts_at: string | null; ends_at: string | null; kind: string; description: string | null }[]
  reminders: { id: string; title: string; remind_at: string; notes: string | null }[]
  todos: { id: string; title: string; due_on: string }[]
}

const KIND: Record<string, string> = { summative: "Summative", exam: "Exam", mock: "Mock exam", ia: "Internal assessment", formative: "Formative", other: "Task" }

/**
 * Private iCal feed for Google Calendar, Apple Calendar or Outlook. The unguessable token in the URL
 * is the only credential; the database function returns data for that token's owner only.
 */
export async function GET(_req: NextRequest, { params }: RouteContext<"/api/calendar/feed/[file]">) {
  const { file } = await params
  const token = file.replace(/\.ics$/i, "")
  const notFound = () => new NextResponse("Not found", { status: 404, headers: { "Cache-Control": "no-store" } })
  if (!/^[A-Za-z0-9_-]{43}$/.test(token)) return notFound()

  const { url, key } = supabaseEnv()
  const supabase = createClient<Database>(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
  const { data, error } = await supabase.rpc("calendar_feed", { p_token: token })
  if (error || !data) return notFound()
  const feed = data as unknown as Feed

  const items: ExportItem[] = [
    ...feed.assessments.map<ExportItem>((a) => ({
      uid: `assessment-${a.id}`,
      title: `${a.status === "upcoming" ? "" : "✓ "}${a.title} (${a.subject})`,
      allDay: true,
      date: a.due_on,
      description: `${a.subject} · ${KIND[a.kind] ?? a.kind}`,
    })),
    ...feed.events.map<ExportItem>((e) =>
      e.all_day
        ? { uid: `event-${e.id}`, title: e.title, allDay: true, date: e.starts_on!, description: e.description }
        : { uid: `event-${e.id}`, title: e.title, allDay: false, start: e.starts_at!, end: e.ends_at, description: e.description },
    ),
    ...feed.reminders.map<ExportItem>((r) => ({ uid: `reminder-${r.id}`, title: `Reminder: ${r.title}`, allDay: false, start: r.remind_at, end: null, description: r.notes })),
    ...feed.todos.map<ExportItem>((t) => ({ uid: `todo-${t.id}`, title: `To-do: ${t.title}`, allDay: true, date: t.due_on })),
  ]

  return new NextResponse(buildIcs({ name: "Academia", stamp: new Date().toISOString(), items }), {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'inline; filename="academia.ics"',
      "Cache-Control": "private, max-age=300",
      "X-Robots-Tag": "noindex, nofollow",
    },
  })
}
