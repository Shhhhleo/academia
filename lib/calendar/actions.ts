"use server"

import { createHash, randomBytes } from "node:crypto"
import { revalidatePath } from "next/cache"
import { requireUser } from "@/lib/auth/session"
import { encryptSecret } from "@/lib/crypto/secret"
import type { ActionResult } from "@/lib/data/schemas"
import type { SyncResult } from "@/lib/managebac/sync"
import { absoluteUrl } from "@/lib/site"
import { normalizeGoogleFeedUrl } from "./google-url"
import { syncGoogleCalendar } from "./google-sync"

const refresh = () => revalidatePath("/", "layout")

/** Creates (or replaces) the private feed link. The token is shown once; only its hash is stored. */
export async function createCalendarFeed(): Promise<ActionResult<{ url: string }>> {
  const { supabase } = await requireUser()
  const token = randomBytes(32).toString("base64url")
  const tokenHash = createHash("sha256").update(token).digest("hex")
  await supabase.from("calendar_feeds").delete().not("id", "is", null)
  const { error } = await supabase.from("calendar_feeds").insert({ token_hash: tokenHash })
  if (error) return { ok: false, error: "We couldn’t create your calendar link." }
  refresh()
  return { ok: true, url: absoluteUrl(`/api/calendar/feed/${token}.ics`) }
}

export async function revokeCalendarFeed(): Promise<ActionResult> {
  const { supabase } = await requireUser()
  const { error } = await supabase.from("calendar_feeds").delete().not("id", "is", null)
  if (error) return { ok: false, error: "We couldn’t turn off your calendar link." }
  refresh()
  return { ok: true }
}

export async function connectGoogleCalendar(link: string): Promise<SyncResult> {
  const checked = normalizeGoogleFeedUrl(String(link ?? ""))
  if (!checked.ok) return { ok: false, error: checked.error }
  const { supabase } = await requireUser()
  const { error } = await supabase.from("integrations").upsert(
    { provider: "google", feed_url_ciphertext: encryptSecret(checked.url), feed_host: checked.host, status: "connected", last_error: null },
    { onConflict: "user_id,provider" },
  )
  if (error) return { ok: false, error: "We couldn’t save the link. Please try again." }
  const result = await syncGoogleCalendar(supabase)
  refresh()
  return result
}

export async function syncGoogleCalendarNow(): Promise<SyncResult> {
  const { supabase } = await requireUser()
  const result = await syncGoogleCalendar(supabase)
  refresh()
  return result
}

export async function disconnectGoogleCalendar(removeImported: boolean): Promise<ActionResult> {
  const { supabase } = await requireUser()
  const { error } = await supabase
    .from("integrations")
    .update({ feed_url_ciphertext: null, feed_host: null, status: "disconnected", last_error: null })
    .eq("provider", "google")
  if (error) return { ok: false, error: "We couldn’t disconnect Google Calendar." }
  if (removeImported) await supabase.from("events").delete().eq("source", "google")
  refresh()
  return { ok: true }
}
