"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useMemo, useState } from "react"
import { Search, X } from "lucide-react"
import { useShell } from "@/components/app/shell-context"
import { AssessmentTable } from "@/components/assessments/assessment-table"
import { Input } from "@/components/ui/input"
import { NativeSelect } from "@/components/ui/native-select"
import { ASSESSMENT_KINDS, KIND_LABEL } from "@/lib/data/schemas"

/** Searchable, filterable assessment manager. Filters live in the URL so views are shareable and survive back/forward. */
export function AssessmentsView() {
  const { subjects } = useShell()
  const params = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const [q, setQ] = useState(params.get("q") ?? "")

  const subject = params.get("subject") ?? ""
  const kind = params.get("kind") ?? ""
  const status = params.get("status") ?? ""
  const from = params.get("from") ?? ""
  const to = params.get("to") ?? ""

  const setParam = (key: string, value: string) => {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value)
    else next.delete(key)
    router.replace(`${pathname}${next.size ? `?${next}` : ""}`, { scroll: false })
  }

  const all = useMemo(() => subjects.flatMap((s) => s.assessments), [subjects])
  const rows = useMemo(() => {
    const term = q.trim().toLowerCase()
    return all.filter(
      (a) =>
        (!term || a.title.toLowerCase().includes(term) || (a.notes ?? "").toLowerCase().includes(term)) &&
        (!subject || a.subject_id === subject) &&
        (!kind || a.kind === kind) &&
        (!status || (status === "uncounted" ? !a.counts : a.status === status)) &&
        (!from || a.due_on >= from) &&
        (!to || a.due_on <= to),
    )
  }, [all, q, subject, kind, status, from, to])

  const active = [subject, kind, status, from, to].filter(Boolean).length + (q ? 1 : 0)

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-2" role="search" aria-label="Filter assessments">
        <div className="min-w-[14rem] flex-1">
          <label htmlFor="f-q" className="sr-only">
            Search assessments
          </label>
          <Input
            id="f-q"
            type="search"
            placeholder="Search tasks or notes…"
            leftIcon={<Search />}
            clearable
            value={q}
            onChange={(e) => {
              setQ(e.target.value)
              setParam("q", e.target.value.trim())
            }}
            className="[&::-webkit-search-cancel-button]:hidden"
          />
        </div>
        <Filter id="f-subject" label="Subject" value={subject} onChange={(v) => setParam("subject", v)}>
          <option value="">All subjects</option>
          {subjects.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </Filter>
        <Filter id="f-kind" label="Type" value={kind} onChange={(v) => setParam("kind", v)}>
          <option value="">All types</option>
          {ASSESSMENT_KINDS.map((k) => (
            <option key={k} value={k}>
              {KIND_LABEL[k]}
            </option>
          ))}
        </Filter>
        <Filter id="f-status" label="Status" value={status} onChange={(v) => setParam("status", v)}>
          <option value="">Any status</option>
          <option value="graded">Graded</option>
          <option value="upcoming">Upcoming</option>
          <option value="uncounted">Not counted</option>
        </Filter>
        <div className="grid gap-1">
          <label htmlFor="f-from" className="text-xs text-muted-foreground">
            From
          </label>
          <Input id="f-from" type="date" value={from} onChange={(e) => setParam("from", e.target.value)} className="w-[9.5rem]" />
        </div>
        <div className="grid gap-1">
          <label htmlFor="f-to" className="text-xs text-muted-foreground">
            To
          </label>
          <Input id="f-to" type="date" value={to} onChange={(e) => setParam("to", e.target.value)} className="w-[9.5rem]" />
        </div>
        {active > 0 && (
          <button
            type="button"
            onClick={() => {
              setQ("")
              router.replace(pathname, { scroll: false })
            }}
            className="inline-flex h-9 items-center gap-1 rounded-lg px-2.5 text-sm text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <X className="size-3.5" aria-hidden="true" /> Clear
          </button>
        )}
      </div>

      <p className="text-sm text-muted-foreground" role="status" aria-live="polite">
        Showing <span className="font-mono tabular text-foreground">{rows.length}</span> of{" "}
        <span className="font-mono tabular">{all.length}</span> assessments
      </p>

      <section className="rounded-[var(--radius-card)] border bg-card px-[var(--card-pad)] shadow-card">
        <AssessmentTable
          rows={rows}
          emptyLabel={all.length === 0 ? "No assessments yet. Press N or use the + button to add your first one." : "No assessments match these filters."}
        />
      </section>
    </div>
  )
}

function Filter({
  id,
  label,
  value,
  onChange,
  children,
}: {
  id: string
  label: string
  value: string
  onChange: (v: string) => void
  children: React.ReactNode
}) {
  return (
    <div className="grid gap-1">
      <label htmlFor={id} className="text-xs text-muted-foreground">
        {label}
      </label>
      <NativeSelect id={id} value={value} onChange={(e) => onChange(e.target.value)} className="w-40">
        {children}
      </NativeSelect>
    </div>
  )
}
