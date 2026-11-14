"use client"

import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { Archive, Loader2, Plus, Settings2, Trash2, X } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { archiveSubject, deleteSubject, saveBoundaries, saveComponents } from "@/lib/data/actions"
import type { SubjectWithGrade } from "@/lib/data/types"
import { DEFAULT_DP_BOUNDARIES } from "@/lib/grades"
import { DP_COMPONENT_PRESETS } from "@/lib/ib"

export function SubjectSettings({ subject }: { subject: SubjectWithGrade }) {
  return (
    <Sheet>
      <SheetTrigger render={<Button variant="outline" size="lg" className="h-9 px-3" />}>
        <Settings2 aria-hidden="true" /> Grading
      </SheetTrigger>
      <SheetContent className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{subject.name}: grading</SheetTitle>
          <SheetDescription>
            {subject.programme === "DP"
              ? "Component weightings and grade boundaries decide how your percentage becomes a 1–7."
              : "MYP grades come from criteria A–D (each /8) using the IB boundaries."}
          </SheetDescription>
        </SheetHeader>
        <div className="space-y-8 px-4 pb-8">
          {subject.programme === "DP" ? (
            <>
              <ComponentsEditor subject={subject} />
              <BoundariesEditor subject={subject} />
            </>
          ) : (
            <MypBoundaries />
          )}
          <DangerZone subject={subject} />
        </div>
      </SheetContent>
    </Sheet>
  )
}

function ComponentsEditor({ subject }: { subject: SubjectWithGrade }) {
  const [rows, setRows] = useState(subject.components.map((c) => ({ id: c.id as string | undefined, name: c.name, weight: String(c.weight) })))
  const [pending, start] = useTransition()
  const total = rows.reduce((s, r) => s + (Number(r.weight) || 0), 0)

  const save = () =>
    start(async () => {
      const r = await saveComponents({
        subjectId: subject.id,
        components: rows.filter((x) => x.name.trim()).map((x) => ({ id: x.id, name: x.name, weight: Number(x.weight) })),
      })
      if (r.ok) toast.success("Components saved")
      else toast.error(r.error)
    })

  return (
    <section aria-labelledby="components-h" className="space-y-3">
      <div>
        <h3 id="components-h" className="text-sm font-semibold">Components</h3>
        <p className="text-xs text-muted-foreground">Match your subject guide, e.g. Paper 1, Paper 2, IA.</p>
      </div>
      {rows.length === 0 && (
        <div className="flex flex-wrap gap-2">
          {DP_COMPONENT_PRESETS.map((p) => (
            <button
              key={p.label}
              type="button"
              onClick={() => setRows(p.components.map((c) => ({ id: undefined, name: c.name, weight: String(c.weight) })))}
              className="rounded-full border px-3 py-1 text-xs hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
              {p.label}
            </button>
          ))}
        </div>
      )}
      <ul className="space-y-2">
        {rows.map((r, i) => (
          <li key={r.id ?? `new-${i}`} className="grid grid-cols-[1fr_5.5rem_2rem] items-center gap-2">
            <Input aria-label={`Component ${i + 1} name`} value={r.name} onChange={(e) => setRows((x) => x.map((y, j) => (j === i ? { ...y, name: e.target.value } : y)))} />
            <div className="relative">
              <Input
                aria-label={`Component ${i + 1} weight percent`}
                type="number"
                min={1}
                max={100}
                value={r.weight}
                onChange={(e) => setRows((x) => x.map((y, j) => (j === i ? { ...y, weight: e.target.value } : y)))}
                className="pr-7 font-mono"
              />
              <span className="pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2 text-xs text-muted-foreground">%</span>
            </div>
            <button
              type="button"
              onClick={() => setRows((x) => x.filter((_, j) => j !== i))}
              className="grid size-8 place-items-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
              aria-label={`Remove ${r.name || "component"}`}
            >
              <X className="size-4" aria-hidden="true" />
            </button>
          </li>
        ))}
      </ul>
      <div className="flex items-center justify-between">
        <Button type="button" variant="ghost" onClick={() => setRows((x) => [...x, { id: undefined, name: "", weight: "" }])}>
          <Plus aria-hidden="true" /> Add component
        </Button>
        <span className={total === 100 ? "font-mono text-xs text-muted-foreground" : "font-mono text-xs text-warning-text"} aria-live="polite">
          Total {total}%{total !== 100 && rows.length > 0 && " (should be 100%)"}
        </span>
      </div>
      <Button onClick={save} disabled={pending} className="w-full">
        {pending && <Loader2 className="animate-spin" aria-hidden="true" />} Save components
      </Button>
    </section>
  )
}

function BoundariesEditor({ subject }: { subject: SubjectWithGrade }) {
  const [rows, setRows] = useState(subject.config.boundaries.map((b) => ({ grade: b.grade, min: String(b.min) })).sort((a, b) => b.grade - a.grade))
  const [pending, start] = useTransition()
  const save = (reset = false) =>
    start(async () => {
      const r = await saveBoundaries({
        subjectId: subject.id,
        boundaries: reset ? null : rows.map((x) => ({ grade: x.grade, min: Number(x.min) })),
      })
      if (!r.ok) return void toast.error(r.error)
      if (reset) setRows(DEFAULT_DP_BOUNDARIES.map((b) => ({ grade: b.grade, min: String(b.min) })))
      toast.success(reset ? "Boundaries reset" : "Boundaries saved")
    })

  return (
    <section aria-labelledby="bounds-h" className="space-y-3">
      <div>
        <h3 id="bounds-h" className="text-sm font-semibold">Grade boundaries</h3>
        <p className="text-xs text-muted-foreground">Minimum percentage for each grade. Use your subject’s latest published boundaries if you have them.</p>
      </div>
      <div className="grid grid-cols-7 gap-1.5">
        {rows.map((r, i) => (
          <label key={r.grade} className="grid gap-1 text-center">
            <span className="font-mono text-xs font-semibold">{r.grade}</span>
            <Input
              aria-label={`Minimum percent for grade ${r.grade}`}
              type="number"
              min={0}
              max={100}
              value={r.min}
              disabled={r.grade === 1}
              onChange={(e) => setRows((x) => x.map((y, j) => (j === i ? { ...y, min: e.target.value } : y)))}
              className="px-1 text-center font-mono text-xs"
            />
          </label>
        ))}
      </div>
      <div className="flex gap-2">
        <Button onClick={() => save()} disabled={pending} className="flex-1">
          Save boundaries
        </Button>
        <Button variant="ghost" onClick={() => save(true)} disabled={pending}>
          Reset
        </Button>
      </div>
    </section>
  )
}

function MypBoundaries() {
  const rows = [
    [7, "28–32"],
    [6, "24–27"],
    [5, "19–23"],
    [4, "15–18"],
    [3, "10–14"],
    [2, "6–9"],
    [1, "1–5"],
  ] as const
  return (
    <section aria-labelledby="myp-h" className="space-y-3">
      <h3 id="myp-h" className="text-sm font-semibold">IB MYP boundaries</h3>
      <table className="w-full text-sm">
        <caption className="sr-only">Criteria total (out of 32) needed for each grade</caption>
        <thead className="text-left text-xs text-muted-foreground">
          <tr>
            <th scope="col" className="py-1 font-medium">Grade</th>
            <th scope="col" className="py-1 font-medium">Criteria total /32</th>
          </tr>
        </thead>
        <tbody className="divide-y font-mono tabular">
          {rows.map(([g, r]) => (
            <tr key={g}>
              <td className="py-1.5">{g}</td>
              <td className="py-1.5">{r}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  )
}

function DangerZone({ subject }: { subject: SubjectWithGrade }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [confirming, setConfirming] = useState(false)
  return (
    <section aria-labelledby="danger-h" className="space-y-3 border-t pt-6">
      <h3 id="danger-h" className="text-sm font-semibold">Manage subject</h3>
      <Button
        variant="outline"
        className="w-full justify-start"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const r = await archiveSubject(subject.id, true)
            if (!r.ok) return void toast.error(r.error)
            toast.success(`Archived ${subject.name}`)
            router.push("/subjects")
          })
        }
      >
        <Archive aria-hidden="true" /> Archive subject
      </Button>
      {!confirming ? (
        <Button variant="destructive" className="w-full justify-start" onClick={() => setConfirming(true)}>
          <Trash2 aria-hidden="true" /> Delete subject…
        </Button>
      ) : (
        <div role="alert" className="space-y-3 rounded-lg border border-destructive/30 bg-destructive/5 p-3">
          <p className="text-sm">
            Delete <strong>{subject.name}</strong> and its {subject.assessments.length} assessment{subject.assessments.length === 1 ? "" : "s"}? This can’t be undone.
          </p>
          <div className="flex gap-2">
            <Button
              variant="destructive"
              disabled={pending}
              onClick={() =>
                start(async () => {
                  const r = await deleteSubject(subject.id)
                  if (!r.ok) return void toast.error(r.error)
                  toast.success(`Deleted ${subject.name}`)
                  router.push("/subjects")
                })
              }
            >
              Yes, delete
            </Button>
            <Button variant="ghost" onClick={() => setConfirming(false)}>
              Cancel
            </Button>
          </div>
        </div>
      )}
    </section>
  )
}
