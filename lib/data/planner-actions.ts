"use server"

import { revalidatePath } from "next/cache"
import { requireUser } from "@/lib/auth/session"
import {
  briefInput,
  reminderInput,
  studyGoalInput,
  studySessionInput,
  todoInput,
  toFieldErrors,
  type ActionResult,
} from "./schemas"

const refresh = () => revalidatePath("/", "layout")
const invalid = (error: import("zod").ZodError): ActionResult<never> => ({
  ok: false,
  error: "Check the highlighted fields.",
  fieldErrors: toFieldErrors(error),
})

// ─────────────────────────────── Study log ───────────────────────────────

export async function logStudySession(input: unknown): Promise<ActionResult<{ id: string }>> {
  const parsed = studySessionInput.safeParse(input)
  if (!parsed.success) return invalid(parsed.error)
  const { supabase } = await requireUser()
  const v = parsed.data
  const { data, error } = await supabase
    .from("study_sessions")
    .insert({ subject_id: v.subjectId ?? null, studied_on: v.studiedOn, minutes: v.minutes, started_at: v.startedAt ?? null, note: v.note })
    .select("id")
    .single()
  if (error || !data) return { ok: false, error: error?.code === "23503" ? "That subject no longer exists." : "We couldn’t log that session." }
  refresh()
  return { ok: true, id: data.id }
}

export async function deleteStudySession(id: string): Promise<ActionResult> {
  const { supabase } = await requireUser()
  const { error } = await supabase.from("study_sessions").delete().eq("id", id)
  if (error) return { ok: false, error: "We couldn’t delete that session." }
  refresh()
  return { ok: true }
}

export async function saveStudyGoals(input: unknown): Promise<ActionResult> {
  const parsed = studyGoalInput.safeParse(input)
  if (!parsed.success) return invalid(parsed.error)
  const { user, supabase } = await requireUser()
  const { error } = await supabase
    .from("profiles")
    .update({ daily_study_goal_minutes: parsed.data.daily, weekly_study_goal_minutes: parsed.data.weekly })
    .eq("id", user.id)
  if (error) return { ok: false, error: "We couldn’t save your study goals." }
  refresh()
  return { ok: true }
}

// ──────────────────────────────── To-dos ────────────────────────────────

export async function saveTodo(input: unknown): Promise<ActionResult<{ id: string }>> {
  const parsed = todoInput.safeParse(input)
  if (!parsed.success) return invalid(parsed.error)
  const { supabase } = await requireUser()
  const v = parsed.data
  const row = { title: v.title, notes: v.notes, due_on: v.dueOn ?? null, subject_id: v.subjectId ?? null, priority: v.priority }
  const { data, error } = v.id
    ? await supabase.from("todos").update(row).eq("id", v.id).select("id").single()
    : await supabase.from("todos").insert(row).select("id").single()
  if (error || !data) return { ok: false, error: "We couldn’t save that task." }
  refresh()
  return { ok: true, id: data.id }
}

export async function setTodoDone(id: string, done: boolean): Promise<ActionResult> {
  const { supabase } = await requireUser()
  const { error } = await supabase.from("todos").update({ done_at: done ? new Date().toISOString() : null }).eq("id", id)
  if (error) return { ok: false, error: "We couldn’t update that task." }
  refresh()
  return { ok: true }
}

export async function deleteTodo(id: string): Promise<ActionResult> {
  const { supabase } = await requireUser()
  const { error } = await supabase.from("todos").delete().eq("id", id)
  if (error) return { ok: false, error: "We couldn’t delete that task." }
  refresh()
  return { ok: true }
}

export async function clearCompletedTodos(): Promise<ActionResult> {
  const { supabase } = await requireUser()
  const { error } = await supabase.from("todos").delete().not("done_at", "is", null)
  if (error) return { ok: false, error: "We couldn’t clear completed tasks." }
  refresh()
  return { ok: true }
}

// ────────────────────────────── Reminders ──────────────────────────────

export async function saveReminder(input: unknown): Promise<ActionResult<{ id: string }>> {
  const parsed = reminderInput.safeParse(input)
  if (!parsed.success) return invalid(parsed.error)
  const { supabase } = await requireUser()
  const v = parsed.data
  const row = { title: v.title, notes: v.notes, remind_at: v.remindAt, subject_id: v.subjectId ?? null }
  const { data, error } = v.id
    ? await supabase.from("reminders").update(row).eq("id", v.id).select("id").single()
    : await supabase.from("reminders").insert(row).select("id").single()
  if (error || !data) return { ok: false, error: "We couldn’t save that reminder." }
  refresh()
  return { ok: true, id: data.id }
}

export async function setReminderDone(id: string, done: boolean): Promise<ActionResult> {
  const { supabase } = await requireUser()
  const { error } = await supabase.from("reminders").update({ done_at: done ? new Date().toISOString() : null }).eq("id", id)
  if (error) return { ok: false, error: "We couldn’t update that reminder." }
  refresh()
  return { ok: true }
}

export async function deleteReminder(id: string): Promise<ActionResult> {
  const { supabase } = await requireUser()
  const { error } = await supabase.from("reminders").delete().eq("id", id)
  if (error) return { ok: false, error: "We couldn’t delete that reminder." }
  refresh()
  return { ok: true }
}

// ───────────────────────────── Daily brief ─────────────────────────────

export async function saveBriefSettings(input: unknown): Promise<ActionResult> {
  const parsed = briefInput.safeParse(input)
  if (!parsed.success) return invalid(parsed.error)
  const { user, supabase } = await requireUser()
  const v = parsed.data
  const { error } = await supabase
    .from("profiles")
    .update({ brief_enabled: v.enabled, brief_time: v.time, brief_days: v.days, timezone: v.timezone })
    .eq("id", user.id)
  if (error) return { ok: false, error: "We couldn’t save your daily brief settings." }
  refresh()
  return { ok: true }
}

/** Records the browser's time zone so "today", streaks and the brief time match the student's clock. */
export async function syncTimezone(timezone: string): Promise<ActionResult> {
  const parsed = briefInput.shape.timezone.safeParse(timezone)
  if (!parsed.success) return { ok: false, error: "Unknown time zone." }
  const { user, supabase } = await requireUser()
  const { error } = await supabase.from("profiles").update({ timezone: parsed.data }).eq("id", user.id)
  if (error) return { ok: false, error: "We couldn’t save your time zone." }
  return { ok: true }
}
