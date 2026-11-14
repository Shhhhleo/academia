"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { z } from "zod"
import { requireUser } from "@/lib/auth/session"
import { profileInput, toFieldErrors, type ActionResult } from "./schemas"

export async function saveProfile(input: unknown): Promise<ActionResult> {
  const parsed = profileInput.safeParse(input)
  if (!parsed.success) return { ok: false, error: "Check the highlighted fields.", fieldErrors: toFieldErrors(parsed.error) }
  const { user, supabase } = await requireUser()
  const v = parsed.data
  const { error } = await supabase
    .from("profiles")
    .update({
      display_name: v.displayName,
      programme: v.programme,
      year_level: v.yearLevel ?? null,
      school_name: v.schoolName,
      accent: v.accent,
      density: v.density,
      default_aggregation: v.defaultAggregation,
      week_start: v.weekStart,
      core_points: v.corePoints ?? null,
    })
    .eq("id", user.id)
  if (error) return { ok: false, error: "We couldn’t save your settings." }
  revalidatePath("/", "layout")
  return { ok: true }
}

const yearInput = z
  .object({
    label: z.string().trim().min(1, "Name the year, e.g. 2027–28.").max(40),
    startsOn: z.iso.date(),
    endsOn: z.iso.date(),
    makeCurrent: z.boolean(),
  })
  .refine((v) => v.endsOn > v.startsOn, { path: ["endsOn"], message: "The year must end after it starts." })

export async function createAcademicYear(input: unknown): Promise<ActionResult> {
  const parsed = yearInput.safeParse(input)
  if (!parsed.success) return { ok: false, error: "Check the highlighted fields.", fieldErrors: toFieldErrors(parsed.error) }
  const { supabase } = await requireUser()
  const v = parsed.data
  if (v.makeCurrent) await supabase.from("academic_years").update({ is_current: false }).eq("is_current", true)
  const { error } = await supabase.from("academic_years").insert({ label: v.label, starts_on: v.startsOn, ends_on: v.endsOn, is_current: v.makeCurrent })
  if (error) return { ok: false, error: "We couldn’t create that year." }
  revalidatePath("/", "layout")
  return { ok: true }
}

export async function setCurrentYear(id: string): Promise<ActionResult> {
  const { supabase } = await requireUser()
  const { data } = await supabase.from("academic_years").select("id").eq("id", id).maybeSingle()
  if (!data) return { ok: false, error: "That year doesn’t exist." }
  await supabase.from("academic_years").update({ is_current: false }).eq("is_current", true)
  const { error } = await supabase.from("academic_years").update({ is_current: true }).eq("id", id)
  if (error) return { ok: false, error: "We couldn’t switch years." }
  revalidatePath("/", "layout")
  return { ok: true }
}

export async function deleteAccount(confirmation: string): Promise<ActionResult> {
  if (String(confirmation).trim().toLowerCase() !== "delete my account") {
    return { ok: false, error: "Type “delete my account” to confirm." }
  }
  const { supabase } = await requireUser()
  const { error } = await supabase.rpc("delete_my_account")
  if (error) return { ok: false, error: "We couldn’t delete your account. Please try again." }
  await supabase.auth.signOut()
  redirect("/?deleted=1")
}
