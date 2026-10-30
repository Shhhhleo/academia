"use client"

import { useState, useTransition } from "react"
import { Download, Loader2, Plus, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { Panel } from "@/components/app/page-header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { createAcademicYear, deleteAccount, setCurrentYear } from "@/lib/data/settings-actions"
import type { AcademicYear } from "@/lib/data/types"

export function YearsSection({ years }: { years: AcademicYear[] }) {
  const latest = years[0]
  const nextStart = latest ? Number(latest.starts_on.slice(0, 4)) + 1 : new Date().getFullYear()
  const [label, setLabel] = useState(`${nextStart}–${String(nextStart + 1).slice(2)}`)
  const [startsOn, setStartsOn] = useState(`${nextStart}-08-01`)
  const [endsOn, setEndsOn] = useState(`${nextStart + 1}-07-31`)
  const [pending, start] = useTransition()

  return (
    <Panel title="Academic years" description="Each year keeps its own subjects and grades. Switch years from the top bar.">
      <ul id="years" className="mb-5 divide-y rounded-lg border">
        {years.map((y) => (
          <li key={y.id} className="flex items-center justify-between gap-3 px-3 py-2.5 text-sm">
            <span>
              <span className="font-mono font-medium tabular">{y.label}</span>
              <span className="ml-2 text-xs text-muted-foreground">
                {y.starts_on} → {y.ends_on}
              </span>
            </span>
            {y.is_current ? (
              <span className="rounded-full bg-primary-soft px-2 py-0.5 text-xs font-medium text-primary">Current</span>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                disabled={pending}
                onClick={() =>
                  start(async () => {
                    const r = await setCurrentYear(y.id)
                    if (r.ok) toast.success(`${y.label} is now the current year`)
                    else toast.error(r.error)
                  })
                }
              >
                Make current
              </Button>
            )}
          </li>
        ))}
      </ul>
      <form
        className="grid items-end gap-3 sm:grid-cols-[1fr_1fr_1fr_auto]"
        onSubmit={(e) => {
          e.preventDefault()
          start(async () => {
            const r = await createAcademicYear({ label, startsOn, endsOn, makeCurrent: true })
            if (r.ok) toast.success(`Created ${label}`)
            else toast.error(r.error)
          })
        }}
      >
        <label className="grid gap-1 text-xs text-muted-foreground">
          Label
          <Input value={label} onChange={(e) => setLabel(e.target.value)} maxLength={40} />
        </label>
        <label className="grid gap-1 text-xs text-muted-foreground">
          Starts
          <Input type="date" value={startsOn} onChange={(e) => setStartsOn(e.target.value)} />
        </label>
        <label className="grid gap-1 text-xs text-muted-foreground">
          Ends
          <Input type="date" value={endsOn} onChange={(e) => setEndsOn(e.target.value)} />
        </label>
        <Button type="submit" disabled={pending} className="h-9">
          <Plus aria-hidden="true" /> Add year
        </Button>
      </form>
    </Panel>
  )
}

export function DataSection() {
  const [confirm, setConfirm] = useState("")
  const [open, setOpen] = useState(false)
  const [pending, start] = useTransition()
  return (
    <Panel title="Your data" description="Your grades belong to you. Export everything any time, or delete your account permanently.">
      <div id="data" className="flex flex-wrap gap-2">
        <a href="/api/export?format=json" className="inline-flex h-9 items-center gap-1.5 rounded-lg border px-3 text-sm font-medium hover:bg-accent">
          <Download className="size-4" aria-hidden="true" /> Export everything (JSON)
        </a>
        <a href="/api/export?format=csv" className="inline-flex h-9 items-center gap-1.5 rounded-lg border px-3 text-sm font-medium hover:bg-accent">
          <Download className="size-4" aria-hidden="true" /> Export assessments (CSV)
        </a>
      </div>
      <div className="mt-6 border-t pt-5">
        {!open ? (
          <Button variant="destructive" onClick={() => setOpen(true)}>
            <Trash2 aria-hidden="true" /> Delete account…
          </Button>
        ) : (
          <div role="alert" className="space-y-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4">
            <p className="text-sm">
              This permanently deletes your account, subjects, assessments, goals and calendar. It can’t be undone. Type{" "}
              <strong className="font-mono">delete my account</strong> to confirm.
            </p>
            <label htmlFor="del-confirm" className="sr-only">
              Confirmation text
            </label>
            <Input id="del-confirm" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="off" className="max-w-xs" />
            <div className="flex gap-2">
              <Button
                variant="destructive"
                disabled={pending || confirm.trim().toLowerCase() !== "delete my account"}
                onClick={() =>
                  start(async () => {
                    const r = await deleteAccount(confirm)
                    if (r && !r.ok) toast.error(r.error)
                  })
                }
              >
                {pending && <Loader2 className="animate-spin" aria-hidden="true" />} Permanently delete
              </Button>
              <Button variant="ghost" onClick={() => setOpen(false)}>
                Cancel
              </Button>
            </div>
          </div>
        )}
      </div>
    </Panel>
  )
}
