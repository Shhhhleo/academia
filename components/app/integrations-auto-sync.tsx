"use client"

import { useEffect } from "react"
import { toast } from "sonner"
import { syncGoogleCalendarNow } from "@/lib/calendar/actions"
import { syncManageBacNow } from "@/lib/managebac/actions"

const STALE_MS = 6 * 60 * 60 * 1000
const CHECK_MS = 30 * 60 * 1000
const LABEL = { managebac: "ManageBac", google: "Google Calendar" } as const

export type LinkedFeed = { provider: keyof typeof LABEL; lastSyncedAt: string | null }

// Lives for the page's lifetime, so a failed sync (which re-renders the layout) is not retried in a loop.
const attempted = new Map<string, number>()

/** Keeps linked calendars fresh while the app is open: syncs any feed over 6 hours old, re-checking every 30 minutes. */
export function IntegrationsAutoSync({ linked }: { linked: LinkedFeed[] }) {
  useEffect(() => {
    if (linked.length === 0) return
    const run = async () => {
      for (const { provider, lastSyncedAt } of linked) {
        const last = Math.max(attempted.get(provider) ?? 0, lastSyncedAt ? new Date(lastSyncedAt).getTime() : 0)
        if (Date.now() - last < STALE_MS) continue
        attempted.set(provider, Date.now())
        const r = provider === "google" ? await syncGoogleCalendarNow() : await syncManageBacNow()
        if (r.ok && r.added > 0) toast.success(`${LABEL[provider]}: ${r.added} new item${r.added === 1 ? "" : "s"} synced`)
      }
    }
    void run()
    const id = window.setInterval(run, CHECK_MS)
    return () => window.clearInterval(id)
  }, [linked])
  return null
}
