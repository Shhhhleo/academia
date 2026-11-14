"use server"

import { revalidatePath } from "next/cache"
import { cookies } from "next/headers"
import { requireUser } from "@/lib/auth/session"
import { encryptSecret } from "@/lib/crypto/secret"
import { parseGradesCsv } from "@/lib/csv/parse-grades"
import { YEAR_COOKIE } from "@/lib/data/queries"
import type { ActionResult } from "@/lib/data/schemas"
import { importYearId } from "@/lib/data/year"
import { normalizeFeedUrl } from "./feed-url"
import { syncManageBac, type SyncResult } from "./sync"

const refresh = () => revalidatePath("/", "layout")

export async function connectManageBac(link: string): Promise<SyncResult> {
  const checked = normalizeFeedUrl(String(link ?? ""))
  if (!checked.ok) return { ok: false, error: checked.error }
  const { supabase } = await requireUser()

  const { error } = await supabase.from("integrations").upsert(
    {
      provider: "managebac",
      feed_url_ciphertext: encryptSecret(checked.url),
      feed_host: checked.host,
      status: "connected",
      last_error: null,
    },
    { onConflict: "user_id,provider" },
  )
  if (error) return { ok: false, error: "We couldn’t save the link. Please try again." }

  const result = await syncManageBac(supabase)
  refresh()
  return result
}

export async function syncManageBacNow(): Promise<SyncResult> {
  const { supabase } = await requireUser()
  const result = await syncManageBac(supabase)
  refresh()
  return result
}

export async function disconnectManageBac(removeImported: boolean): Promise<ActionResult> {
  const { supabase } = await requireUser()
  const { error } = await supabase
    .from("integrations")
    .update({ feed_url_ciphertext: null, feed_host: null, status: "disconnected", last_error: null })
    .eq("provider", "managebac")
  if (error) return { ok: false, error: "We couldn’t disconnect. Please try again." }
  if (removeImported) {
    await supabase.from("events").delete().eq("source", "managebac")
    await supabase.from("assessments").delete().eq("source", "managebac").eq("status", "upcoming")
  }
  refresh()
  return { ok: true }
}

export type CsvImportResult = ActionResult<{ added: number; errors: string[] }>

/** Imports graded results from CSV. Subjects are matched by name (case-insensitive) in the selected year. */
export async function importGradesCsv(text: string, dryRun: boolean): Promise<CsvImportResult> {
  if (typeof text !== "string" || text.length > 512_000) return { ok: false, error: "That file is too large (max 500 KB)." }
  const { rows, errors } = parseGradesCsv(text)
  const { supabase } = await requireUser()
  const yearId = await importYearId(supabase, (await cookies()).get(YEAR_COOKIE)?.value)
  const { data: subjects } = yearId
    ? await supabase.from("subjects").select("id, name, programme").eq("archived", false).eq("academic_year_id", yearId)
    : { data: [] }
  const byName = new Map((subjects ?? []).map((s) => [s.name.trim().toLowerCase(), s]))

  const problems = [...errors]
  const inserts = rows.flatMap((r) => {
    const s = byName.get(r.subject.toLowerCase())
    if (!s) {
      problems.push(`Line ${r.line}: no subject called “${r.subject}”. Create it first or fix the name.`)
      return []
    }
    return [
      {
        subject_id: s.id,
        title: r.title,
        kind: r.kind,
        status: "graded" as const,
        due_on: r.date,
        counts: r.kind !== "formative",
        raw_score: r.score,
        max_score: r.max,
        criteria: r.criteria,
        source: "csv" as const,
      },
    ]
  })

  if (dryRun) return { ok: true, added: inserts.length, errors: problems }
  if (inserts.length === 0) return { ok: false, error: problems[0] ?? "Nothing to import." }

  const { error } = await supabase.from("assessments").insert(inserts)
  await supabase.from("import_runs").insert({
    kind: "csv",
    status: error ? "error" : "success",
    added: error ? 0 : inserts.length,
    skipped: problems.length,
    error: error ? "Insert failed" : null,
    finished_at: new Date().toISOString(),
  })
  if (error) return { ok: false, error: "Some values were out of range, so nothing was imported." }
  refresh()
  return { ok: true, added: inserts.length, errors: problems }
}
