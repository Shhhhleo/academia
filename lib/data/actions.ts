"use server"

import { revalidatePath } from "next/cache"
import { cookies } from "next/headers"
import { requireUser } from "@/lib/auth/session"
import { computeSubjectGrade } from "@/lib/grades"
import type { ServerClient } from "@/lib/supabase/server"
import { YEAR_COOKIE } from "./queries"
import {
  assessmentInput,
  boundariesInput,
  componentsInput,
  goalInput,
  subjectInput,
  toFieldErrors,
  type ActionResult,
} from "./schemas"
import { subjectConfig, toEngineAssessment } from "./to-engine"
import type { Assessment, Component, Subject } from "./types"

function dbError(error: { code?: string; message?: string } | null, fallback: string): ActionResult<never> {
  switch (error?.code) {
    case "23503":
      return { ok: false, error: "That item no longer exists. Refresh and try again." }
    case "23514":
      return { ok: false, error: "Some values are out of range. Check the form and try again." }
    case "23505":
      return { ok: false, error: "That already exists." }
    case "42501":
      return { ok: false, error: "You don't have access to that." }
    default:
      return { ok: false, error: fallback }
  }
}

const refresh = () => revalidatePath("/", "layout")

async function subjectGrade(supabase: ServerClient, subjectId: string) {
  const { data } = await supabase
    .from("subjects")
    .select("*, components(*), assessments(*)")
    .eq("id", subjectId)
    .maybeSingle()
  if (!data) return null
  const row = data as Subject & { components: Component[]; assessments: Assessment[] }
  const result = computeSubjectGrade(row.assessments.map(toEngineAssessment), subjectConfig(row, row.components))
  return { name: row.name, grade: result.grade }
}

// ───────────────────────────── Assessments ─────────────────────────────

export type SaveAssessmentResult = ActionResult<{ id: string; subjectName: string; before: number | null; after: number | null }>

export async function saveAssessment(input: unknown): Promise<SaveAssessmentResult> {
  const parsed = assessmentInput.safeParse(input)
  if (!parsed.success) return { ok: false, error: "Check the highlighted fields.", fieldErrors: toFieldErrors(parsed.error) }
  const { supabase } = await requireUser()
  const v = parsed.data

  const before = await subjectGrade(supabase, v.subjectId)
  if (!before) return { ok: false, error: "That subject no longer exists." }

  const row = {
    subject_id: v.subjectId,
    component_id: v.componentId ?? null,
    title: v.title,
    kind: v.kind,
    status: v.status,
    due_on: v.dueOn,
    counts: v.counts,
    raw_score: v.rawScore ?? null,
    max_score: v.maxScore ?? null,
    weight: v.weight,
    criteria: v.criteria,
    notes: v.notes,
  }

  const { data, error } = v.id
    ? await supabase.from("assessments").update(row).eq("id", v.id).select("id").single()
    : await supabase.from("assessments").insert(row).select("id").single()
  if (error || !data) return dbError(error, "We couldn't save that assessment.")

  const after = await subjectGrade(supabase, v.subjectId)
  if (after && after.grade !== before.grade && after.grade != null) {
    const delta = before.grade == null ? null : after.grade - before.grade
    await supabase.from("notifications").insert({
      title: `${after.name} is now a ${after.grade}`,
      body:
        delta == null
          ? `Your first graded task set an estimated grade of ${after.grade}.`
          : `Estimated grade ${delta > 0 ? "rose" : "fell"} from ${before.grade} to ${after.grade} after “${v.title}”.`,
      href: `/subjects/${v.subjectId}`,
    })
  }

  refresh()
  return { ok: true, id: data.id, subjectName: before.name, before: before.grade, after: after?.grade ?? null }
}

export async function deleteAssessment(id: string): Promise<ActionResult> {
  const { supabase } = await requireUser()
  const { error, count } = await supabase.from("assessments").delete({ count: "exact" }).eq("id", id)
  if (error) return dbError(error, "We couldn't delete that assessment.")
  if (!count) return { ok: false, error: "That assessment was already removed." }
  refresh()
  return { ok: true }
}

/** Restores a row removed by deleteAssessment (the "Undo" toast). */
export async function restoreAssessment(snapshot: Assessment): Promise<ActionResult> {
  const { user, supabase } = await requireUser()
  const parsed = assessmentInput.safeParse({
    subjectId: snapshot.subject_id,
    componentId: snapshot.component_id,
    title: snapshot.title,
    kind: snapshot.kind,
    status: snapshot.status,
    dueOn: snapshot.due_on,
    counts: snapshot.counts,
    rawScore: snapshot.raw_score,
    maxScore: snapshot.max_score,
    weight: snapshot.weight,
    criteria: snapshot.criteria ?? {},
    notes: snapshot.notes,
  })
  if (!parsed.success) return { ok: false, error: "That assessment can't be restored." }
  const { error } = await supabase.from("assessments").insert({
    id: snapshot.id,
    user_id: user.id,
    subject_id: parsed.data.subjectId,
    component_id: parsed.data.componentId ?? null,
    title: parsed.data.title,
    kind: parsed.data.kind,
    status: parsed.data.status,
    due_on: parsed.data.dueOn,
    counts: parsed.data.counts,
    raw_score: parsed.data.rawScore ?? null,
    max_score: parsed.data.maxScore ?? null,
    weight: parsed.data.weight,
    criteria: parsed.data.criteria,
    notes: parsed.data.notes,
    source: snapshot.source,
    external_uid: snapshot.external_uid,
  })
  if (error) return dbError(error, "We couldn't restore that assessment.")
  refresh()
  return { ok: true }
}

// ─────────────────────────────── Subjects ───────────────────────────────

export async function saveSubject(input: unknown): Promise<ActionResult<{ id: string }>> {
  const parsed = subjectInput.safeParse(input)
  if (!parsed.success) return { ok: false, error: "Check the highlighted fields.", fieldErrors: toFieldErrors(parsed.error) }
  const { supabase } = await requireUser()
  const v = parsed.data
  const row = {
    name: v.name,
    programme: v.programme,
    level: v.programme === "MYP" ? ("MYP" as const) : v.level === "MYP" ? ("SL" as const) : v.level,
    color: v.color.toLowerCase(),
    subject_group: v.subjectGroup,
    teacher: v.teacher,
    target_grade: v.targetGrade ?? null,
    reported_grade: v.reportedGrade ?? null,
    aggregation: v.aggregation,
    managebac_match: v.managebacMatch,
  }

  if (v.id) {
    const { data, error } = await supabase.from("subjects").update(row).eq("id", v.id).select("id").single()
    if (error || !data) return dbError(error, "We couldn't update that subject.")
    refresh()
    return { ok: true, id: data.id }
  }

  const yearId = await selectedYearId(supabase)
  if (!yearId) return { ok: false, error: "Create an academic year first (Settings → Academic years)." }
  const { count } = await supabase.from("subjects").select("id", { count: "exact", head: true }).eq("academic_year_id", yearId)
  const { data, error } = await supabase
    .from("subjects")
    .insert({ ...row, academic_year_id: yearId, position: count ?? 0 })
    .select("id")
    .single()
  if (error || !data) return dbError(error, "We couldn't create that subject.")
  refresh()
  return { ok: true, id: data.id }
}

export async function archiveSubject(id: string, archived: boolean): Promise<ActionResult> {
  const { supabase } = await requireUser()
  const { error } = await supabase.from("subjects").update({ archived }).eq("id", id)
  if (error) return dbError(error, "We couldn't update that subject.")
  refresh()
  return { ok: true }
}

export async function deleteSubject(id: string): Promise<ActionResult> {
  const { supabase } = await requireUser()
  const { error } = await supabase.from("subjects").delete().eq("id", id)
  if (error) return dbError(error, "We couldn't delete that subject.")
  refresh()
  return { ok: true }
}

export async function saveComponents(input: unknown): Promise<ActionResult> {
  const parsed = componentsInput.safeParse(input)
  if (!parsed.success) return { ok: false, error: "Each component needs a name and a weight between 0 and 100." }
  const { supabase } = await requireUser()
  const { subjectId, components } = parsed.data

  const { data: existing, error: readError } = await supabase.from("components").select("id").eq("subject_id", subjectId)
  if (readError) return dbError(readError, "We couldn't load the components.")
  const keep = new Set(components.map((c) => c.id).filter(Boolean))
  const remove = (existing ?? []).map((c) => c.id).filter((id) => !keep.has(id))
  if (remove.length) {
    const { error } = await supabase.from("components").delete().in("id", remove)
    if (error) return dbError(error, "We couldn't remove a component.")
  }
  for (const [position, c] of components.entries()) {
    const { error } = c.id
      ? await supabase.from("components").update({ name: c.name, weight: c.weight, position }).eq("id", c.id)
      : await supabase.from("components").insert({ subject_id: subjectId, name: c.name, weight: c.weight, position })
    if (error) return dbError(error, "We couldn't save the components.")
  }
  refresh()
  return { ok: true }
}

export async function saveBoundaries(input: unknown): Promise<ActionResult> {
  const parsed = boundariesInput.safeParse(input)
  if (!parsed.success) return { ok: false, error: "Each boundary must be a percentage between 0 and 100." }
  const { supabase } = await requireUser()
  const { error } = await supabase
    .from("subjects")
    .update({ boundaries: parsed.data.boundaries })
    .eq("id", parsed.data.subjectId)
  if (error) return dbError(error, "We couldn't save the boundaries.")
  refresh()
  return { ok: true }
}

// ──────────────────────────── Shell helpers ────────────────────────────

async function selectedYearId(supabase: ServerClient) {
  const fromCookie = (await cookies()).get(YEAR_COOKIE)?.value
  const { data } = await supabase.from("academic_years").select("id, is_current").order("starts_on", { ascending: false })
  return (data ?? []).find((y) => y.id === fromCookie)?.id ?? data?.find((y) => y.is_current)?.id ?? data?.[0]?.id ?? null
}

export async function selectYear(yearId: string): Promise<ActionResult> {
  const { supabase } = await requireUser()
  const { data } = await supabase.from("academic_years").select("id").eq("id", yearId).maybeSingle()
  if (!data) return { ok: false, error: "That academic year doesn't exist." }
  ;(await cookies()).set(YEAR_COOKIE, data.id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  })
  refresh()
  return { ok: true }
}

export async function markNotificationsRead(): Promise<ActionResult> {
  const { supabase } = await requireUser()
  const { error } = await supabase.from("notifications").update({ read_at: new Date().toISOString() }).is("read_at", null)
  if (error) return dbError(error, "We couldn't update your notifications.")
  refresh()
  return { ok: true }
}

// ──────────────────────────────── Goals ────────────────────────────────

export async function saveGoal(input: unknown): Promise<ActionResult<{ id: string }>> {
  const parsed = goalInput.safeParse(input)
  if (!parsed.success) return { ok: false, error: "Check the highlighted fields.", fieldErrors: toFieldErrors(parsed.error) }
  const { supabase } = await requireUser()
  const v = parsed.data
  if (v.metric === "subject_grade" && (!v.subjectId || v.targetValue > 7)) {
    return { ok: false, error: "Pick a subject and a target grade from 1 to 7.", fieldErrors: { subjectId: "Pick a subject." } }
  }
  const row = {
    subject_id: v.metric === "subject_grade" ? (v.subjectId ?? null) : null,
    title: v.title,
    metric: v.metric,
    target_value: v.targetValue,
    current_value: v.metric === "custom" ? (v.currentValue ?? null) : null,
    deadline: v.deadline ?? null,
  }
  const { data, error } = v.id
    ? await supabase.from("goals").update(row).eq("id", v.id).select("id").single()
    : await supabase.from("goals").insert(row).select("id").single()
  if (error || !data) return dbError(error, "We couldn't save that goal.")
  refresh()
  return { ok: true, id: data.id }
}

export async function deleteGoal(id: string): Promise<ActionResult> {
  const { supabase } = await requireUser()
  const { error } = await supabase.from("goals").delete().eq("id", id)
  if (error) return dbError(error, "We couldn't delete that goal.")
  refresh()
  return { ok: true }
}
