"use client"

import { useMemo, useState, useTransition } from "react"
import { format, parseISO } from "date-fns"
import { ArrowDown, ArrowUp, ArrowUpDown, MoreHorizontal, Pencil, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { useShell } from "@/components/app/shell-context"
import { AssessmentForm } from "@/components/assessments/assessment-form"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { deleteAssessment, restoreAssessment } from "@/lib/data/actions"
import { KIND_LABEL } from "@/lib/data/schemas"
import type { Assessment } from "@/lib/data/types"
import { CRITERIA, type Criterion } from "@/lib/grades"
import { cn } from "@/lib/utils"

type SortKey = "title" | "subject" | "date" | "result"

export function resultText(a: Assessment, programme: "MYP" | "DP") {
  if (a.status === "upcoming") return null
  if (programme === "MYP") {
    const c = (a.criteria ?? {}) as Partial<Record<Criterion, number | null>>
    return CRITERIA.filter((k) => c[k] != null).map((k) => `${k}${c[k]}`).join(" ") || "–"
  }
  if (a.raw_score == null || a.max_score == null) return null
  return `${a.raw_score}/${a.max_score}`
}

function resultValue(a: Assessment): number {
  if (a.status === "upcoming") return -1
  if (a.raw_score != null && a.max_score) return a.raw_score / a.max_score
  const vals = Object.values((a.criteria ?? {}) as Record<string, number | null>).filter((v): v is number => v != null)
  return vals.length ? vals.reduce((x, y) => x + y, 0) / vals.length / 8 : -1
}

export function AssessmentTable({
  rows,
  showSubject = true,
  emptyLabel = "No assessments yet.",
}: {
  rows: Assessment[]
  showSubject?: boolean
  emptyLabel?: string
}) {
  const { subjects } = useShell()
  const byId = useMemo(() => new Map(subjects.map((s) => [s.id, s])), [subjects])
  const [sort, setSort] = useState<{ key: SortKey; dir: "asc" | "desc" }>({ key: "date", dir: "desc" })
  const [editing, setEditing] = useState<Assessment | null>(null)
  const [, start] = useTransition()

  const sorted = useMemo(() => {
    const dir = sort.dir === "asc" ? 1 : -1
    const val = (a: Assessment): string | number =>
      sort.key === "title"
        ? a.title.toLowerCase()
        : sort.key === "subject"
          ? (byId.get(a.subject_id)?.name ?? "").toLowerCase()
          : sort.key === "result"
            ? resultValue(a)
            : a.due_on
    return [...rows].sort((a, b) => (val(a) < val(b) ? -dir : val(a) > val(b) ? dir : 0))
  }, [rows, sort, byId])

  const remove = (a: Assessment) =>
    start(async () => {
      const r = await deleteAssessment(a.id)
      if (!r.ok) return void toast.error(r.error)
      toast(`Deleted “${a.title}”`, {
        action: {
          label: "Undo",
          onClick: () =>
            start(async () => {
              const back = await restoreAssessment(a)
              if (!back.ok) toast.error(back.error)
            }),
        },
      })
    })

  const header = (key: SortKey, label: string, className?: string) => {
    const active = sort.key === key
    const Icon = !active ? ArrowUpDown : sort.dir === "asc" ? ArrowUp : ArrowDown
    return (
      <th scope="col" aria-sort={active ? (sort.dir === "asc" ? "ascending" : "descending") : "none"} className={cn("px-3 py-2.5 font-medium", className)}>
        <button
          type="button"
          onClick={() => setSort((s) => ({ key, dir: s.key === key && s.dir === "desc" ? "asc" : "desc" }))}
          className="inline-flex items-center gap-1 rounded hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          {label}
          <Icon className={cn("size-3", !active && "opacity-40")} aria-hidden="true" />
        </button>
      </th>
    )
  }

  if (rows.length === 0) {
    return <p className="px-1 py-8 text-center text-sm text-muted-foreground">{emptyLabel}</p>
  }

  return (
    <>
      <div className="-mx-[var(--card-pad)] overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="border-y bg-surface-2/60 text-left text-xs text-muted-foreground">
            <tr>
              {header("title", "Task", "pl-[var(--card-pad)]")}
              {showSubject && header("subject", "Subject")}
              {header("date", "Date")}
              {header("result", "Result")}
              <th scope="col" className="px-3 py-2.5 font-medium">
                Status
              </th>
              <th scope="col" className="w-12 pr-[var(--card-pad)]">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {sorted.map((a) => {
              const s = byId.get(a.subject_id)
              const result = s ? resultText(a, s.programme) : null
              const pct = a.raw_score != null && a.max_score ? (a.raw_score / a.max_score) * 100 : null
              const comp = s?.components.find((c) => c.id === a.component_id)
              return (
                <tr key={a.id} id={`assessment-${a.id}`} className="group scroll-mt-24 transition-colors hover:bg-accent/40 target:bg-primary-soft">
                  <td className="py-[var(--row-pad)] pr-3 pl-[var(--card-pad)]">
                    <span className="block font-medium">{a.title}</span>
                    <span className="text-xs text-muted-foreground">
                      {KIND_LABEL[a.kind]}
                      {comp && ` · ${comp.name}`}
                      {a.source === "managebac" && " · ManageBac"}
                    </span>
                  </td>
                  {showSubject && (
                    <td className="px-3 py-[var(--row-pad)]">
                      <span className="inline-flex items-center gap-2">
                        <span className="size-2 rounded-full" style={{ backgroundColor: s?.color }} aria-hidden="true" />
                        {s?.name ?? "Unknown"}
                      </span>
                    </td>
                  )}
                  <td className="px-3 py-[var(--row-pad)] font-mono text-xs whitespace-nowrap tabular text-muted-foreground">
                    {format(parseISO(a.due_on), "d MMM yyyy")}
                  </td>
                  <td className="px-3 py-[var(--row-pad)] font-mono text-xs whitespace-nowrap tabular">
                    {result ?? <span className="text-muted-foreground">–</span>}
                    {pct != null && <span className="ml-1.5 text-muted-foreground">{pct.toFixed(0)}%</span>}
                  </td>
                  <td className="px-3 py-[var(--row-pad)]">
                    <span
                      className={cn(
                        "inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium",
                        a.status === "upcoming"
                          ? "bg-warning/12 text-warning-text"
                          : a.counts
                            ? "bg-success/12 text-success-text"
                            : "bg-muted text-muted-foreground",
                      )}
                    >
                      {a.status === "upcoming" ? "Upcoming" : a.counts ? "Counted" : "Not counted"}
                    </span>
                  </td>
                  <td className="pr-[var(--card-pad)] text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        className="grid size-8 place-items-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                        aria-label={`Actions for ${a.title}`}
                      >
                        <MoreHorizontal className="size-4" aria-hidden="true" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-36">
                        <DropdownMenuItem onClick={() => setEditing(a)}>
                          <Pencil aria-hidden="true" /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem variant="destructive" onClick={() => remove(a)}>
                          <Trash2 aria-hidden="true" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <Dialog open={editing != null} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Edit assessment</DialogTitle>
            <DialogDescription>Changes recalculate the subject grade straight away.</DialogDescription>
          </DialogHeader>
          {editing && <AssessmentForm subjects={subjects} initial={editing} onDone={() => setEditing(null)} />}
        </DialogContent>
      </Dialog>
    </>
  )
}
