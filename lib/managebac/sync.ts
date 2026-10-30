import "server-only"
import { decryptSecret } from "@/lib/crypto/secret"
import type { ServerClient } from "@/lib/supabase/server"
import { fetchFeed, FeedError } from "./fetch-feed"
import { inferKind, matchSubject, parseIcs } from "./ics"

export const MIN_SYNC_INTERVAL_MS = 60_000

export type SyncResult = { ok: true; added: number; updated: number; skipped: number } | { ok: false; error: string }

/**
 * Pulls the user's ManageBac feed into `events` (every item) and `assessments`
 * (upcoming tasks whose class matches a subject). Rows are keyed by the feed UID,
 * so repeat syncs update instead of duplicating, and a task the user has already
 * graded is never overwritten. Runs entirely as the signed-in user (RLS applies).
 */
export async function syncManageBac(supabase: ServerClient): Promise<SyncResult> {
  const { data: integration } = await supabase.from("integrations").select("*").eq("provider", "managebac").maybeSingle()
  if (!integration?.feed_url_ciphertext) return { ok: false, error: "Connect your ManageBac calendar first." }

  const { data: lastRun } = await supabase
    .from("import_runs")
    .select("started_at")
    .eq("kind", "managebac")
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle()
  if (lastRun && Date.now() - new Date(lastRun.started_at).getTime() < MIN_SYNC_INTERVAL_MS) {
    return { ok: false, error: "Synced moments ago. Try again in a minute." }
  }

  const { data: run } = await supabase.from("import_runs").insert({ integration_id: integration.id, kind: "managebac" }).select("id").single()
  const finish = async (patch: { status: "success" | "error"; added?: number; updated?: number; skipped?: number; error?: string }) => {
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
    const items = parseIcs(await fetchFeed(decryptSecret(integration.feed_url_ciphertext)))
    if (items.length === 0) {
      await finish({ status: "success", added: 0, updated: 0, skipped: 0 })
      return { ok: true, added: 0, updated: 0, skipped: 0 }
    }

    const [{ data: subjects }, { data: existingEvents }, { data: existingTasks }] = await Promise.all([
      supabase.from("subjects").select("id, name, managebac_match").eq("archived", false),
      supabase.from("events").select("id, external_uid").eq("source", "managebac"),
      supabase.from("assessments").select("id, external_uid, status").eq("source", "managebac"),
    ])
    const subjectList = (subjects ?? []).map((s) => ({ id: s.id, name: s.name, managebacMatch: s.managebac_match }))
    const eventUids = new Set((existingEvents ?? []).map((e) => e.external_uid))
    const taskByUid = new Map((existingTasks ?? []).map((t) => [t.external_uid, t]))

    let added = 0
    let updated = 0
    let skipped = 0

    const eventRows = items.map((it) => {
      const kind = inferKind(it.title)
      eventUids.has(it.uid) ? updated++ : added++
      return {
        title: it.title,
        description: it.description,
        all_day: it.allDay,
        starts_on: it.allDay ? it.date! : null,
        ends_on: it.allDay ? (it.endDate ?? null) : null,
        starts_at: it.allDay ? null : it.startsAt!,
        ends_at: it.allDay ? null : (it.endsAt ?? null),
        kind: kind.event,
        source: "managebac" as const,
        external_uid: it.uid.slice(0, 300),
        subject_id: matchSubject(it.title, subjectList),
      }
    })
    for (let i = 0; i < eventRows.length; i += 200) {
      const { error } = await supabase.from("events").upsert(eventRows.slice(i, i + 200), { onConflict: "user_id,source,external_uid" })
      if (error) throw new Error("Saving calendar events failed.")
    }

    const today = new Date().toISOString().slice(0, 10)
    for (const it of items) {
      const subjectId = matchSubject(it.title, subjectList)
      const kind = inferKind(it.title).assessment
      const due = it.allDay ? it.date! : it.startsAt!.slice(0, 10)
      if (!subjectId || !kind) continue
      const existing = taskByUid.get(it.uid)
      if (existing) {
        if (existing.status === "graded") {
          skipped++
          continue
        }
        await supabase.from("assessments").update({ title: it.title.slice(0, 160), due_on: due, subject_id: subjectId }).eq("id", existing.id)
      } else if (due >= today) {
        await supabase.from("assessments").insert({
          subject_id: subjectId,
          title: it.title.slice(0, 160),
          kind,
          status: "upcoming",
          due_on: due,
          counts: kind !== "formative",
          source: "managebac",
          external_uid: it.uid.slice(0, 300),
        })
      }
    }

    await finish({ status: "success", added, updated, skipped })
    if (added > 0) {
      await supabase.from("notifications").insert({
        title: `ManageBac synced: ${added} new item${added === 1 ? "" : "s"}`,
        body: "New deadlines and events were added to your calendar.",
        href: "/calendar",
      })
    }
    return { ok: true, added, updated, skipped }
  } catch (e) {
    const message = e instanceof FeedError ? e.message : "The sync failed. Try again, or reconnect your calendar link."
    await finish({ status: "error", error: message })
    return { ok: false, error: message }
  }
}
