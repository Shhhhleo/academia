import "server-only"
import { cookies } from "next/headers"
import { cache } from "react"
import { requireUser } from "@/lib/auth/session"
import { overviewOf, withGrade } from "./to-engine"
import type { Assessment, Component, Subject, Workspace } from "./types"

export const YEAR_COOKIE = "academia-year"

type SubjectRow = Subject & { components: Component[] | null; assessments: Assessment[] | null }

/** Everything the signed-in user's pages need for the selected academic year. RLS scopes every query. */
export const getWorkspace = cache(async (): Promise<Workspace> => {
  const { user, supabase } = await requireUser()
  const yearCookie = (await cookies()).get(YEAR_COOKIE)?.value

  const [profileRes, yearsRes] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).single(),
    supabase.from("academic_years").select("*").order("starts_on", { ascending: false }),
  ])
  if (profileRes.error || !profileRes.data) throw new Error("Your profile could not be loaded.")
  const years = yearsRes.data ?? []
  const year = years.find((y) => y.id === yearCookie) ?? years.find((y) => y.is_current) ?? years[0]
  if (!year) throw new Error("No academic year found for this account.")

  const { data, error } = await supabase
    .from("subjects")
    .select("*, components(*), assessments(*)")
    .eq("academic_year_id", year.id)
    .eq("archived", false)
    .order("position")
    .order("name")
  if (error) throw new Error("Your subjects could not be loaded.")

  const subjects = ((data ?? []) as SubjectRow[]).map((s) => {
    const { components, assessments, ...subject } = s
    return withGrade(subject, components ?? [], assessments ?? [])
  })

  return {
    profile: profileRes.data,
    years,
    year,
    subjects,
    overview: overviewOf(subjects, profileRes.data),
  }
})

export const getNotifications = cache(async () => {
  const { supabase } = await requireUser()
  const { data } = await supabase.from("notifications").select("*").order("created_at", { ascending: false }).limit(20)
  return data ?? []
})

export const getGoals = cache(async () => {
  const { supabase } = await requireUser()
  const { data } = await supabase.from("goals").select("*").order("created_at")
  return data ?? []
})

/** Calendar events overlapping [from, to] (yyyy-mm-dd), both all-day and timed. */
const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/

export const getEvents = cache(async (from: string, to: string) => {
  // Interpolated into a PostgREST filter below, so only strict yyyy-mm-dd values are allowed.
  if (!ISO_DAY.test(from) || !ISO_DAY.test(to)) throw new Error("Invalid date range")
  const { supabase } = await requireUser()
  const { data } = await supabase
    .from("events")
    .select("*")
    .or(`and(all_day.eq.true,starts_on.gte.${from},starts_on.lte.${to}),and(all_day.eq.false,starts_at.gte.${from}T00:00:00Z,starts_at.lte.${to}T23:59:59Z)`)
    .order("starts_on", { ascending: true, nullsFirst: false })
    .limit(1000)
  return data ?? []
})

export async function getSubject(id: string) {
  const ws = await getWorkspace()
  return ws.subjects.find((s) => s.id === id) ?? null
}

/** Study sessions from the last ~13 months (enough for streaks and weekly views). */
export const getStudySessions = cache(async () => {
  const { supabase } = await requireUser()
  const since = new Date(Date.now() - 400 * 86_400_000).toISOString().slice(0, 10)
  const { data } = await supabase
    .from("study_sessions")
    .select("*")
    .gte("studied_on", since)
    .order("studied_on", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(3000)
  return data ?? []
})

export const getTodos = cache(async () => {
  const { supabase } = await requireUser()
  const { data } = await supabase.from("todos").select("*").order("done_at", { ascending: true, nullsFirst: true }).order("due_on", { ascending: true, nullsFirst: false }).limit(1000)
  return data ?? []
})

export const getReminders = cache(async () => {
  const { supabase } = await requireUser()
  const since = new Date(Date.now() - 30 * 86_400_000).toISOString()
  const { data } = await supabase.from("reminders").select("*").gte("remind_at", since).order("remind_at").limit(500)
  return data ?? []
})
