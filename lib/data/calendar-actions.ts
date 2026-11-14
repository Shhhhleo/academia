"use server"

import { revalidatePath } from "next/cache"
import { requireUser } from "@/lib/auth/session"
import { eventInput, toFieldErrors, type ActionResult } from "./schemas"

export async function saveEvent(input: unknown): Promise<ActionResult<{ id: string }>> {
  const parsed = eventInput.safeParse(input)
  if (!parsed.success) return { ok: false, error: "Check the highlighted fields.", fieldErrors: toFieldErrors(parsed.error) }
  const { supabase } = await requireUser()
  const v = parsed.data
  const row = {
    title: v.title,
    description: v.description,
    kind: v.kind,
    subject_id: v.subjectId ?? null,
    all_day: v.allDay,
    starts_on: v.allDay ? v.startsOn! : null,
    starts_at: v.allDay ? null : v.startsAt!,
    ends_at: v.allDay ? null : (v.endsAt ?? null),
  }
  // Only manual events are editable; ManageBac items are read-only copies of the feed.
  const { data, error } = v.id
    ? await supabase.from("events").update(row).eq("id", v.id).eq("source", "manual").select("id").single()
    : await supabase.from("events").insert({ ...row, source: "manual" }).select("id").single()
  if (error || !data) return { ok: false, error: "We couldn’t save that event." }
  revalidatePath("/", "layout")
  return { ok: true, id: data.id }
}

export async function deleteEvent(id: string): Promise<ActionResult> {
  const { supabase } = await requireUser()
  const { error } = await supabase.from("events").delete().eq("id", id).eq("source", "manual")
  if (error) return { ok: false, error: "We couldn’t delete that event." }
  revalidatePath("/", "layout")
  return { ok: true }
}
