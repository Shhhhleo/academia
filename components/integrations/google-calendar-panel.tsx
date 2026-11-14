"use client"

import { useState, useTransition } from "react"
import { formatDistanceToNow } from "date-fns"
import { ArrowDownToLine, ArrowUpFromLine, Check, Copy, ExternalLink, Loader2, RefreshCw, ShieldCheck, Unplug } from "lucide-react"
import { toast } from "sonner"
import { Panel } from "@/components/app/page-header"
import { FormMessage } from "@/components/forms/form-field"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { connectGoogleCalendar, createCalendarFeed, disconnectGoogleCalendar, revokeCalendarFeed, syncGoogleCalendarNow } from "@/lib/calendar/actions"

export function ExportFeedPanel({ hasFeed, lastAccessed }: { hasFeed: boolean; lastAccessed: string | null }) {
  const [url, setUrl] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [pending, start] = useTransition()
  const googleAdd = url ? `https://calendar.google.com/calendar/r?cid=${encodeURIComponent(url.replace(/^https:/, "webcal:"))}` : null

  return (
    <Panel
      title={
        <span className="inline-flex items-center gap-2">
          <ArrowUpFromLine className="size-4 text-primary" aria-hidden="true" /> Show Academia in Google Calendar
        </span>
      }
      description="Your assessments, events, reminders and dated to-dos appear as a calendar in Google Calendar, on your phone and laptop."
    >
      {url ? (
        <div className="space-y-3">
          <p className="text-sm font-medium">Your private calendar link</p>
          <div className="flex gap-2">
            <Input readOnly value={url} aria-label="Private calendar link" className="font-mono text-xs" onFocus={(e) => e.currentTarget.select()} />
            <Button
              variant="outline"
              onClick={async () => {
                await navigator.clipboard.writeText(url)
                setCopied(true)
                setTimeout(() => setCopied(false), 1800)
              }}
              aria-label="Copy link"
            >
              {copied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
            </Button>
          </div>
          <a
            href={googleAdd!}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
          >
            Add to Google Calendar <ExternalLink className="size-4" aria-hidden="true" />
          </a>
          <p className="text-xs text-muted-foreground">
            Copy it now: for your security it is only shown once. Or in Google Calendar: Other calendars → + → From URL → paste. Google refreshes subscribed calendars every few hours.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            {hasFeed
              ? `You have an active link${lastAccessed ? `, last read by a calendar app ${formatDistanceToNow(new Date(lastAccessed), { addSuffix: true })}` : ""}. Creating a new one turns the old link off.`
              : "Create a private link that only calendar apps you give it to can read."}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              disabled={pending}
              onClick={() =>
                start(async () => {
                  const r = await createCalendarFeed()
                  if (r.ok) setUrl(r.url)
                  else toast.error(r.error)
                })
              }
            >
              {pending && <Loader2 className="animate-spin" aria-hidden="true" />} {hasFeed ? "Create a new link" : "Create my calendar link"}
            </Button>
            {hasFeed && (
              <Button
                variant="outline"
                disabled={pending}
                onClick={() =>
                  start(async () => {
                    const r = await revokeCalendarFeed()
                    if (r.ok) toast.success("Calendar link turned off")
                    else toast.error(r.error)
                  })
                }
              >
                Turn off link
              </Button>
            )}
          </div>
        </div>
      )}
    </Panel>
  )
}

export function ImportGooglePanel({ connected, status, lastSyncedAt, lastError }: { connected: boolean; status: string; lastSyncedAt: string | null; lastError: string | null }) {
  const [link, setLink] = useState("")
  const [error, setError] = useState<string>()
  const [removeImported, setRemoveImported] = useState(false)
  const [pending, start] = useTransition()

  return (
    <Panel
      title={
        <span className="inline-flex items-center gap-2">
          <ArrowDownToLine className="size-4 text-primary" aria-hidden="true" /> Show Google Calendar in Academia
        </span>
      }
      description="Bring your Google Calendar events into Academia’s calendar and daily brief. Read-only: Academia never changes your Google Calendar."
    >
      {connected && (
        <div className="mb-5 flex items-center justify-between gap-3 rounded-lg border bg-surface-2/60 p-3 text-sm">
          <span>
            <span className="block font-medium">{status === "error" ? "Connected, but the last sync failed" : "Connected"}</span>
            <span className="block text-xs text-muted-foreground">
              {status === "error" && lastError ? lastError : lastSyncedAt ? `Synced ${formatDistanceToNow(new Date(lastSyncedAt), { addSuffix: true })}` : "Not synced yet"}
            </span>
          </span>
          <Button
            variant="outline"
            disabled={pending}
            onClick={() =>
              start(async () => {
                const r = await syncGoogleCalendarNow()
                if (r.ok) toast.success(r.added ? `${r.added} new event${r.added === 1 ? "" : "s"}` : "Already up to date")
                else toast.error(r.error)
              })
            }
          >
            {pending ? <Loader2 className="animate-spin" aria-hidden="true" /> : <RefreshCw aria-hidden="true" />} Sync now
          </Button>
        </div>
      )}
      <ol className="mb-4 list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
        <li>Open Google Calendar on a computer, then Settings (gear icon).</li>
        <li>Under “Settings for my calendars”, choose your calendar, then “Integrate calendar”.</li>
        <li>Copy “Secret address in iCal format” and paste it below.</li>
      </ol>
      <form
        className="grid gap-3"
        onSubmit={(e) => {
          e.preventDefault()
          setError(undefined)
          start(async () => {
            const r = await connectGoogleCalendar(link)
            if (!r.ok) return setError(r.error)
            setLink("")
            toast.success(`Connected · ${r.added} event${r.added === 1 ? "" : "s"} imported`)
          })
        }}
        noValidate
      >
        <label htmlFor="gc-link" className="sr-only">
          Google Calendar secret iCal address
        </label>
        <Input
          id="gc-link"
          type="url"
          autoComplete="off"
          spellCheck={false}
          placeholder="https://calendar.google.com/calendar/ical/…/basic.ics"
          value={link}
          onChange={(e) => setLink(e.target.value)}
          error={Boolean(error)}
        />
        <FormMessage status="error" message={error} />
        <div>
          <Button type="submit" disabled={pending || !link.trim()}>
            {pending && <Loader2 className="animate-spin" aria-hidden="true" />} {connected ? "Replace and sync" : "Connect and sync"}
          </Button>
        </div>
      </form>
      {connected && (
        <div className="mt-5 space-y-3 border-t pt-4">
          <label className="flex items-center gap-2.5 text-sm">
            <input type="checkbox" checked={removeImported} onChange={(e) => setRemoveImported(e.target.checked)} className="size-4 accent-[var(--primary)]" />
            Also remove imported Google events
          </label>
          <Button
            variant="destructive"
            disabled={pending}
            onClick={() =>
              start(async () => {
                const r = await disconnectGoogleCalendar(removeImported)
                if (r.ok) toast.success("Google Calendar disconnected")
                else toast.error(r.error)
              })
            }
          >
            <Unplug aria-hidden="true" /> Disconnect
          </Button>
        </div>
      )}
      <p className="mt-5 flex gap-2 rounded-lg bg-muted p-3 text-xs text-muted-foreground">
        <ShieldCheck className="size-4 shrink-0 text-success-text" aria-hidden="true" />
        The secret address is encrypted before it’s stored and only ever sent to calendar.google.com. You can reset it in Google Calendar at any time.
      </p>
    </Panel>
  )
}
