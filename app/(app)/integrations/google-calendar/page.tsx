import type { Metadata } from "next"
import { PageHeader } from "@/components/app/page-header"
import { ExportFeedPanel, ImportGooglePanel } from "@/components/integrations/google-calendar-panel"
import { requireUser } from "@/lib/auth/session"

export const metadata: Metadata = { title: "Google Calendar" }

export default async function GoogleCalendarPage() {
  const { supabase } = await requireUser()
  const [{ data: feed }, { data: google }] = await Promise.all([
    supabase.from("calendar_feeds").select("created_at, last_accessed_at").maybeSingle(),
    supabase.from("integrations").select("status, feed_host, last_synced_at, last_error").eq("provider", "google").maybeSingle(),
  ])
  return (
    <>
      <PageHeader
        title="Google Calendar"
        description="Link Academia and Google Calendar both ways: see your Academia deadlines in Google, and your Google events in Academia."
      />
      <div className="grid gap-4 lg:grid-cols-2">
        <ExportFeedPanel hasFeed={Boolean(feed)} lastAccessed={feed?.last_accessed_at ?? null} />
        <ImportGooglePanel
          connected={Boolean(google?.feed_host)}
          status={google?.status ?? "disconnected"}
          lastSyncedAt={google?.last_synced_at ?? null}
          lastError={google?.last_error ?? null}
        />
      </div>
      <p className="mt-6 max-w-3xl text-xs text-muted-foreground">
        These links work with Apple Calendar and Outlook too. Academia uses calendar subscription links rather than signing in to your Google account, so it
        never sees your Google password or anything outside the calendar you choose to share.
      </p>
    </>
  )
}
