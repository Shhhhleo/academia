"use client"

import { useMemo, useState } from "react"
import { ArrowRight, Plus, RotateCcw, X } from "lucide-react"
import { useShell } from "@/components/app/shell-context"
import { Panel } from "@/components/app/page-header"
import { GradeNumber } from "@/components/grades/grade-badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { NativeSelect } from "@/components/ui/native-select"
import { toEngineAssessment } from "@/lib/data/to-engine"
import { CRITERIA, computeSubjectGrade, requiredForTarget, type Criterion, type EngineAssessment } from "@/lib/grades"
import { cn } from "@/lib/utils"

interface Row {
  id: number
  criteria: Record<Criterion, string>
  pct: string
  weight: string
  componentId: string
}

let seq = 0
const blankRow = (): Row => ({ id: ++seq, criteria: { A: "", B: "", C: "", D: "" }, pct: "", weight: "1", componentId: "" })
const num = (v: string) => (v.trim() === "" ? null : Number(v))

export function WhatIf({ initialSubjectId }: { initialSubjectId?: string }) {
  const { subjects } = useShell()
  const [subjectId, setSubjectId] = useState(initialSubjectId ?? subjects[0]?.id ?? "")
  const [rows, setRows] = useState<Row[]>([blankRow()])
  const subject = subjects.find((s) => s.id === subjectId)
  const [target, setTarget] = useState<string>(String(subject?.target_grade ?? 7))
  const [nextWeight, setNextWeight] = useState("1")
  const [nextComponent, setNextComponent] = useState("")

  const result = useMemo(() => {
    if (!subject) return null
    const base = subject.assessments.map(toEngineAssessment)
    const hypo: EngineAssessment[] = rows.map((r, i) =>
      subject.programme === "MYP"
        ? {
            id: `h${r.id}`,
            date: `9999-01-${String(i + 1).padStart(2, "0")}`,
            status: "graded",
            counts: true,
            criteria: Object.fromEntries(CRITERIA.map((c) => [c, num(r.criteria[c])])),
          }
        : {
            id: `h${r.id}`,
            date: `9999-01-${String(i + 1).padStart(2, "0")}`,
            status: "graded",
            counts: true,
            rawScore: num(r.pct),
            maxScore: 100,
            weight: num(r.weight) ?? 1,
            componentId: r.componentId || null,
          },
    )
    const usable = hypo.filter((h) => (h.criteria ? Object.values(h.criteria).some((v) => v != null) : h.rawScore != null))
    const now = computeSubjectGrade(base, subject.config)
    const projected = computeSubjectGrade([...base, ...usable], subject.config)
    const need = requiredForTarget([...base, ...usable], subject.config, Number(target), {
      weight: num(nextWeight) ?? 1,
      componentId: nextComponent || null,
    })
    return { now, projected, need, hypotheticals: usable.length }
  }, [subject, rows, target, nextWeight, nextComponent])

  if (!subject || !result) {
    return <p className="text-sm text-muted-foreground">Add a subject first to use the calculator.</p>
  }

  const isMyp = subject.programme === "MYP"
  const delta = result.now.grade != null && result.projected.grade != null ? result.projected.grade - result.now.grade : null

  return (
    <div className="grid gap-4 lg:grid-cols-5">
      <Panel title="What if…" description="Add hypothetical results and watch your grade change. Nothing here is saved." className="lg:col-span-3">
        <div className="mb-5 max-w-xs">
          <label htmlFor="calc-subject" className="mb-1.5 block text-sm font-medium">
            Subject
          </label>
          <NativeSelect
            id="calc-subject"
            value={subjectId}
            onChange={(e) => {
              setSubjectId(e.target.value)
              setRows([blankRow()])
              setTarget(String(subjects.find((s) => s.id === e.target.value)?.target_grade ?? 7))
            }}
          >
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </NativeSelect>
        </div>

        <ol className="space-y-3">
          {rows.map((r, i) => (
            <li key={r.id} className="rounded-lg border bg-surface-2/50 p-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">Hypothetical task {i + 1}</span>
                <button
                  type="button"
                  onClick={() => setRows((x) => (x.length > 1 ? x.filter((y) => y.id !== r.id) : [blankRow()]))}
                  className="grid size-7 place-items-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
                  aria-label={`Remove hypothetical task ${i + 1}`}
                >
                  <X className="size-3.5" aria-hidden="true" />
                </button>
              </div>
              {isMyp ? (
                <div className="grid grid-cols-4 gap-2">
                  {CRITERIA.map((c) => (
                    <div key={c} className="grid gap-1">
                      <label htmlFor={`h-${r.id}-${c}`} className="text-xs text-muted-foreground">
                        Criterion {c}
                      </label>
                      <NativeSelect
                        id={`h-${r.id}-${c}`}
                        value={r.criteria[c]}
                        onChange={(e) => setRows((x) => x.map((y) => (y.id === r.id ? { ...y, criteria: { ...y.criteria, [c]: e.target.value } } : y)))}
                        className="font-mono"
                      >
                        <option value="">–</option>
                        {Array.from({ length: 9 }, (_, k) => (
                          <option key={k} value={k}>
                            {k}
                          </option>
                        ))}
                      </NativeSelect>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="grid gap-2 sm:grid-cols-3">
                  <div className="grid gap-1">
                    <label htmlFor={`h-${r.id}-pct`} className="text-xs text-muted-foreground">
                      Score %
                    </label>
                    <Input id={`h-${r.id}-pct`} type="number" min={0} max={100} value={r.pct} onChange={(e) => setRows((x) => x.map((y) => (y.id === r.id ? { ...y, pct: e.target.value } : y)))} className="font-mono" />
                  </div>
                  <div className="grid gap-1">
                    <label htmlFor={`h-${r.id}-w`} className="text-xs text-muted-foreground">
                      Weight
                    </label>
                    <Input id={`h-${r.id}-w`} type="number" min={0.1} value={r.weight} onChange={(e) => setRows((x) => x.map((y) => (y.id === r.id ? { ...y, weight: e.target.value } : y)))} className="font-mono" />
                  </div>
                  {subject.components.length > 0 && (
                    <div className="grid gap-1">
                      <label htmlFor={`h-${r.id}-c`} className="text-xs text-muted-foreground">
                        Component
                      </label>
                      <NativeSelect id={`h-${r.id}-c`} value={r.componentId} onChange={(e) => setRows((x) => x.map((y) => (y.id === r.id ? { ...y, componentId: e.target.value } : y)))}>
                        <option value="">Not assigned</option>
                        {subject.components.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </NativeSelect>
                    </div>
                  )}
                </div>
              )}
            </li>
          ))}
        </ol>
        <div className="mt-3 flex gap-2">
          <Button variant="outline" onClick={() => setRows((x) => [...x, blankRow()])}>
            <Plus aria-hidden="true" /> Add another
          </Button>
          <Button variant="ghost" onClick={() => setRows([blankRow()])}>
            <RotateCcw aria-hidden="true" /> Reset
          </Button>
        </div>
      </Panel>

      <div className="space-y-4 lg:col-span-2">
        <Panel title="Projected grade">
          <div className="flex items-center gap-4" aria-live="polite">
            <div>
              <p className="text-xs text-muted-foreground">Now</p>
              <GradeNumber grade={result.now.grade} size="lg" className="text-muted-foreground" />
            </div>
            <ArrowRight className="size-5 text-muted-foreground" aria-hidden="true" />
            <div>
              <p className="text-xs text-muted-foreground">With {result.hypotheticals} hypothetical{result.hypotheticals === 1 ? "" : "s"}</p>
              <GradeNumber
                grade={result.projected.grade}
                size="lg"
                className={cn(delta != null && delta > 0 && "text-success-text", delta != null && delta < 0 && "text-decline-text")}
              />
            </div>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            {isMyp
              ? `Criteria total ${result.projected.criteriaTotal ?? "–"}/32${result.projected.partial ? " (projected from the criteria assessed)" : ""}.`
              : `Weighted ${result.projected.percentage == null ? "–" : `${result.projected.percentage.toFixed(1)}%`}.`}
          </p>
        </Panel>

        <Panel title="What do I need?">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-1">
              <label htmlFor="need-target" className="text-xs text-muted-foreground">
                Target grade
              </label>
              <NativeSelect id="need-target" value={target} onChange={(e) => setTarget(e.target.value)} className="font-mono">
                {[7, 6, 5, 4, 3, 2, 1].map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </NativeSelect>
            </div>
            {!isMyp && (
              <div className="grid gap-1">
                <label htmlFor="need-weight" className="text-xs text-muted-foreground">
                  Next task weight
                </label>
                <Input id="need-weight" type="number" min={0.1} value={nextWeight} onChange={(e) => setNextWeight(e.target.value)} className="font-mono" />
              </div>
            )}
            {!isMyp && subject.components.length > 0 && (
              <div className="grid gap-1 sm:col-span-2">
                <label htmlFor="need-comp" className="text-xs text-muted-foreground">
                  Next task component
                </label>
                <NativeSelect id="need-comp" value={nextComponent} onChange={(e) => setNextComponent(e.target.value)}>
                  <option value="">Not assigned</option>
                  {subject.components.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </NativeSelect>
              </div>
            )}
          </div>
          <div className="mt-4 rounded-lg bg-muted px-4 py-3" aria-live="polite">
            {!result.need.achievable ? (
              <p className="text-sm font-medium text-warning-text">Not reachable with one more task. You’ll need several strong results.</p>
            ) : result.need.unit === "level" ? (
              <p className="text-sm">
                Score at least <span className="font-mono text-lg font-semibold tabular">{result.need.required}</span> in every criterion on your next task.
              </p>
            ) : (
              <p className="text-sm">
                Score at least <span className="font-mono text-lg font-semibold tabular">{Math.ceil(result.need.required ?? 0)}%</span> on your next task.
              </p>
            )}
          </div>
        </Panel>
      </div>
    </div>
  )
}
