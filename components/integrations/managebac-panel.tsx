"use client"

import { useState, useTransition } from "react"
import { formatDistanceToNow } from "date-fns"
import { CircleAlert, CircleCheck, Link2, Loader2, PlugZap, RefreshCw, ShieldCheck, Unplug } from "lucide-react"
import { toast } from "sonner"
import { Panel } from "@/components/app/page-header"
import { FormMessage } from "@/components/forms/form-field"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { maskFeedHost } from "@/lib/managebac/feed-url"
import { connectManageBac, disconnectManageBac, syncManageBacNow } from "@/lib/managebac/actions"
import { cn } from "@/lib/utils"

export interface IntegrationInfo {
  connected: boolean
  host: string | null
  status: string
  lastSyncedAt: string | null
  lastError: string | null
}

export function ManageBacPanel({ info }: { info: IntegrationInfo }) {
  const [link, setLink] = useState("")
  const [error, setError] = useState<string>()
  const [removeImported, setRemoveImported] = useState(false)
  const [pending, start] = useTransition()

  const connect = (e: React.FormEvent) => {
    e.preventDefault()
    setError(undefined)
    start(async () => {
      const r = await connectManageBac(link)
      if (!r.ok) return setError(r.error)
      setLink("")
      toast.success(`Connected · ${r.added} item${r.added === 1 ? "" : "s"} imported`)
    })
  }

  const statusTone = !info.connected ? "muted" : info.status === "error" ? "warning" : "success"

  return (
    <div className="grid gap-4 lg:grid-cols-5">
      <Panel title="Connection" className="lg:col-span-3">
        <div
          className={cn(
            "flex items-start gap-3 rounded-lg border p-4",
            statusTone === "success" && "border-success/30 bg-success/5",
            statusTone === "warning" && "border-warning/40 bg-warning/5",
          )}
        >
          {statusTone === "success" ? (
            <CircleCheck className="mt-0.5 size-5 text-success-text" aria-hidden="true" />
          ) : statusTone === "warning" ? (
            <CircleAlert className="mt-0.5 size-5 text-warning-text" aria-hidden="true" />
          ) : (
            <Unplug className="mt-0.5 size-5 text-muted-foreground" aria-hidden="true" />
          )}
          <div className="min-w-0 flex-1 text-sm">
            <p className="font-medium">
              {!info.connected ? "Not connected" : info.status === "error" ? "Connected, but the last sync failed" : "Connected"}
            </p>
            {info.connected && (
              <>
                <p className="mt-0.5 truncate font-mono text-xs text-muted-foreground">{maskFeedHost(info.host)}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {info.lastSyncedAt ? `Last synced ${formatDistanceToNow(new Date(info.lastSyncedAt), { addSuffix: true })}` : "Not synced yet"}
                </p>
                {info.status === "error" && info.lastError && <p className="mt-1 text-xs text-warning-text">{info.lastError}</p>}
              </>
            )}
          </div>
          {info.connected && (
            <Button
              variant="outline"
              disabled={pending}
              onClick={() =>
                start(async () => {
                  const r = await syncManageBacNow()
                  if (r.ok) toast.success(r.added ? `${r.added} new item${r.added === 1 ? "" : "s"} synced` : "Already up to date")
                  else toast.error(r.error)
                })
              }
            >
              {pending ? <Loader2 className="animate-spin" aria-hidden="true" /> : <RefreshCw aria-hidden="true" />} Sync now
            </Button>
          )}
        </div>

        <form onSubmit={connect} className="mt-6 grid gap-3" noValidate>
          <label htmlFor="mb-link" className="text-sm font-medium">
            {info.connected ? "Replace calendar link" : "ManageBac calendar link"}
          </label>
          <Input
            id="mb-link"
            type="url"
            inputMode="url"
            autoComplete="off"
            spellCheck={false}
            placeholder="webcal://yourschool.managebac.com/…/events.ics"
            leftIcon={<Link2 />}
            value={link}
            onChange={(e) => setLink(e.target.value)}
            error={Boolean(error)}
            aria-describedby="mb-link-hint"
          />
          <p id="mb-link-hint" className="text-xs text-muted-foreground">
            Paste the subscribe link from ManageBac. We only accept links from managebac.com or managebac.cn.
          </p>
          <FormMessage status="error" message={error} />
          <div>
            <Button type="submit" size="lg" className="px-4" disabled={pending || !link.trim()}>
              {pending ? <Loader2 className="animate-spin" aria-hidden="true" /> : <PlugZap aria-hidden="true" />}
              {info.connected ? "Update and sync" : "Connect and sync"}
            </Button>
          </div>
        </form>

        {info.connected && (
          <div className="mt-6 space-y-3 border-t pt-5">
            <label className="flex items-center gap-2.5 text-sm">
              <input type="checkbox" checked={removeImported} onChange={(e) => setRemoveImported(e.target.checked)} className="size-4 accent-[var(--primary)]" />
              Also remove imported events and upcoming tasks
            </label>
            <Button
              variant="destructive"
              disabled={pending}
              onClick={() =>
                start(async () => {
                  const r = await disconnectManageBac(removeImported)
                  if (r.ok) toast.success("ManageBac disconnected")
                  else toast.error(r.error)
                })
              }
            >
              <Unplug aria-hidden="true" /> Disconnect
            </Button>
          </div>
        )}
      </Panel>

      <Panel title="How to get your link" className="lg:col-span-2">
        <ol className="space-y-4 text-sm">
          {[
            ["Open ManageBac", "Sign in at your school’s ManageBac site and go to Calendar."],
            ["Copy the subscribe link", "Choose Subscribe (or the ⋯ menu → Subscribe to Calendar) and copy the webcal:// or https:// link."],
            ["Paste it here", "Academia imports your deadlines and events, and matches tasks to subjects by class name."],
          ].map(([t, d], i) => (
            <li key={t} className="flex gap-3">
              <span className="grid size-6 shrink-0 place-items-center rounded-full bg-primary-soft font-mono text-xs font-semibold text-primary">{i + 1}</span>
              <span>
                <span className="block font-medium">{t}</span>
                <span className="text-muted-foreground">{d}</span>
              </span>
            </li>
          ))}
        </ol>
        <div className="mt-5 flex gap-2.5 rounded-lg bg-muted p-3 text-xs text-muted-foreground">
          <ShieldCheck className="size-4 shrink-0 text-success-text" aria-hidden="true" />
          <p>
            The link works like a password, so it’s encrypted before it’s stored and never shown again. Academia never asks for your ManageBac
            password and can’t change anything in ManageBac. The sync is read-only, one way.
          </p>
        </div>
      </Panel>
    </div>
  )
}
