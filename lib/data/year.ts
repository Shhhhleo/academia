import "server-only"
import type { ServerClient } from "@/lib/supabase/server"

/**
 * The academic year that imports attach to: `preferredId` when it is one of the
 * user's years (e.g. the year selected in the top bar), else the current year,
 * else the newest. Keeps synced tasks off last year's subjects of the same name.
 */
export async function importYearId(supabase: ServerClient, preferredId?: string | null): Promise<string | null> {
  const { data } = await supabase.from("academic_years").select("id, is_current").order("starts_on", { ascending: false })
  const years = data ?? []
  return (years.find((y) => y.id === preferredId) ?? years.find((y) => y.is_current) ?? years[0])?.id ?? null
}

/** Deletes rows by id in URL-sized chunks (RLS still limits it to the caller's rows). */
export async function deleteByIds(supabase: ServerClient, table: "events" | "assessments", ids: string[]) {
  for (let i = 0; i < ids.length; i += 100) {
    const { error } = await supabase.from(table).delete().in("id", ids.slice(i, i + 100))
    if (error) throw new Error("Removing items that left the calendar failed.")
  }
}
