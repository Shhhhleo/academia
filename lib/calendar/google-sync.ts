import "server-only"
import { decryptSecret } from "@/lib/crypto/secret"
import { deleteByIds, importYearId } from "@/lib/data/year"
import { fetchFeed, FeedError } from "@/lib/managebac/fetch-feed"
import { inferKind, matchSubject, parseIcs } from "@/lib/managebac/ics"
import { staleIds } from "@/lib/managebac/reconcile"
import { MIN_SYNC_INTERVAL_MS, type SyncResult } from "@/lib/managebac/sync"
import { localDay } from "@/lib/study/streak"
import type { ServerClient } from "@/lib/supabase/server"
import { normalizeGoogleFeedUrl } from "./google-url"

/** Google exports a calendar's whole history, so allow a bigger download than ManageBac's feed. */
const GOOGLE_MAX_BYTES = 8 * 1024 * 1024

/** Imports a Google Calendar (via its secret iCal address) into `events` as read-only items. */
export async function syncGoogleCalendar(supabase: ServerClient): Promise<SyncResult> {
  const { data: integration } = await supabase.from("integrations").select("*").eq("provider", "google").maybeSingle()
  if (!integration?.feed_url_ciphertext) return { ok: false, error: "Connect your Google Calendar first." }

  const { data: lastRun } = await supabase
    .from("import_runs")
    .select("started_at")
    .eq("kind", "google")
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle()
  if (lastRun && Date.now() - new Date(lastRun.started_at).getTime() < MIN_SYNC_INTERVAL_MS) {
    return { ok: false, error: "Synced moments ago. Try again in a minute." }
  }

  const { data: run } = await supabase.from("import_runs").insert({ integration_id: integration.id, kind: "google" }).select("id").single()
  const finish = async (patch: { status: "success" | "error"; added?: number; updated?: number; error?: string }) => {
    if (run) await supabase.from("import_runs").update({ ...patch, finished_at: new Date().toISOString() }).eq("id", run.id)
    await supabase
      .from("integrations")
      .update(
        patch.status === "success"
          ? { status: "connected", last_synced_at: new Date().toISOString(), last_error: null }
          : { status: "error", last_error: patch.error?.slice(0, 500) ?? "Sync failed" },
      )
      .eq("id", integration.id)
  }

  try {
    const now = Date.now()
    // A useful window: the last 30 days and the next year, with repeating events expanded.
    const from = now - 30 * 86_400_000
    const items = parseIcs(await fetchFeed(decryptSecret(integration.feed_url_ciphertext), normalizeGoogleFeedUrl, "Google Calendar", GOOGLE_MAX_BYTES), {
      from,
      to: now + 366 * 86_400_000,
    })

    const [{ data: profile }, yearId, { data: existing }] = await Promise.all([
      supabase.from("profiles").select("timezone").maybeSingle(),
      importYearId(supabase),
      supabase.from("events").select("id, external_uid, starts_on, starts_at").eq("source", "google"),
    ])
    const timezone = profile?.timezone ?? "UTC"
    const { data: subjects } = yearId
      ? await supabase.from("subjects").select("id, name, managebac_match").eq("archived", false).eq("academic_year_id", yearId)
      : { data: [] }
    const subjectList = (subjects ?? []).map((s) => ({ id: s.id, name: s.name, managebacMatch: s.managebac_match }))
    const known = new Set((existing ?? []).map((e) => e.external_uid))
    let added = 0
    let updated = 0
    const rows = items.map((it) => {
      if (known.has(it.uid)) updated++
      else added++
      return {
        title: it.title,
        description: it.description,
        all_day: it.allDay,
        starts_on: it.allDay ? it.date! : null,
        ends_on: it.allDay ? (it.endDate ?? null) : null,
        starts_at: it.allDay ? null : it.startsAt!,
        ends_at: it.allDay ? null : (it.endsAt ?? null),
        kind: inferKind(it.title).event,
        source: "google" as const,
        external_uid: it.uid,
        subject_id: matchSubject(it.title, subjectList),
      }
    })
    for (let i = 0; i < rows.length; i += 200) {
      const { error } = await supabase.from("events").upsert(rows.slice(i, i + 200), { onConflict: "user_id,source,external_uid" })
      if (error) throw new Error("Saving calendar events failed.")
    }
    // Events deleted in Google (or from a calendar that was replaced) leave Academia too; older history stays.
    const feedUids = new Set(items.map((it) => it.uid))
    const dayOf = (e: { starts_on: string | null; starts_at: string | null }) => e.starts_on ?? (e.starts_at ? localDay(new Date(e.starts_at), timezone) : null)
    if (items.length > 0) await deleteByIds(supabase, "events", staleIds(existing ?? [], feedUids, dayOf, localDay(new Date(from), timezone)))
    await finish({ status: "success", added, updated })
    return { ok: true, added, updated, skipped: 0 }
  } catch (e) {
    const message = e instanceof FeedError ? e.message : "The sync failed. Try again, or reconnect your Google Calendar link."
    await finish({ status: "error", error: message })
    return { ok: false, error: message }
  }
}
