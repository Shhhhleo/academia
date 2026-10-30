"use client"

import Link from "next/link"
import { useMemo, useState, useTransition } from "react"
import { ArrowRight, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { FormField, FormMessage } from "@/components/forms/form-field"
import { GradeNumber } from "@/components/grades/grade-badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { NativeSelect } from "@/components/ui/native-select"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { saveAssessment } from "@/lib/data/actions"
import { ASSESSMENT_KINDS, KIND_LABEL } from "@/lib/data/schemas"
import { toEngineAssessment } from "@/lib/data/to-engine"
import type { Assessment, SubjectWithGrade } from "@/lib/data/types"
import { CRITERIA, computeSubjectGrade, type Criterion, type EngineAssessment } from "@/lib/grades"
import { cn } from "@/lib/utils"

const today = () => new Date().toLocaleDateString("en-CA")
const num = (v: string) => (v.trim() === "" ? null : Number(v))

export function AssessmentForm({
  subjects,
  initial,
  defaultSubjectId,
  onDone,
}: {
  subjects: SubjectWithGrade[]
  initial?: Assessment
  defaultSubjectId?: string
  onDone?: () => void
}) {
  const [subjectId, setSubjectId] = useState(initial?.subject_id ?? defaultSubjectId ?? subjects[0]?.id ?? "")
  const [title, setTitle] = useState(initial?.title ?? "")
  const [kind, setKind] = useState<(typeof ASSESSMENT_KINDS)[number]>(initial?.kind ?? "summative")
  const [status, setStatus] = useState<"graded" | "upcoming">(initial?.status ?? "graded")
  const [dueOn, setDueOn] = useState(initial?.due_on ?? today())
  const [counts, setCounts] = useState(initial?.counts ?? true)
  const initialCriteria = (initial?.criteria ?? {}) as Partial<Record<Criterion, number | null>>
  const [criteria, setCriteria] = useState<Record<Criterion, string>>({
    A: initialCriteria.A?.toString() ?? "",
    B: initialCriteria.B?.toString() ?? "",
    C: initialCriteria.C?.toString() ?? "",
    D: initialCriteria.D?.toString() ?? "",
  })
  const [rawScore, setRawScore] = useState(initial?.raw_score?.toString() ?? "")
  const [maxScore, setMaxScore] = useState(initial?.max_score?.toString() ?? "")
  const [weight, setWeight] = useState(initial?.weight?.toString() ?? "1")
  const [componentId, setComponentId] = useState(initial?.component_id ?? "")
  const [notes, setNotes] = useState(initial?.notes ?? "")
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState<string>()
  const [pending, start] = useTransition()

  const subject = subjects.find((s) => s.id === subjectId)
  const isMyp = subject?.programme === "MYP"

  const payload = {
    id: initial?.id,
    subjectId,
    componentId: !isMyp && componentId ? componentId : null,
    title,
    kind,
    status,
    dueOn,
    counts,
    rawScore: isMyp ? null : num(rawScore),
    maxScore: isMyp ? null : num(maxScore),
    weight: num(weight) ?? 1,
    criteria: isMyp ? Object.fromEntries(CRITERIA.map((c) => [c, num(criteria[c])])) : {},
    notes: notes || null,
  }

  // Live "your grade becomes…" preview using the same engine as the server.
  const preview = useMemo(() => {
    if (!subject || status !== "graded" || !counts) return null
    const others = subject.assessments.filter((a) => a.id !== initial?.id).map(toEngineAssessment)
    const hypo: EngineAssessment = {
      id: "__preview__",
      date: dueOn || today(),
      status: "graded",
      counts: true,
      criteria: payload.criteria as Partial<Record<Criterion, number | null>>,
      rawScore: payload.rawScore,
      maxScore: payload.maxScore,
      weight: payload.weight,
      componentId: payload.componentId,
    }
    const hasResult = isMyp ? Object.values(payload.criteria).some((v) => v != null) : payload.rawScore != null && (payload.maxScore ?? 0) > 0
    if (!hasResult) return null
    const before = computeSubjectGrade(others, subject.config).grade
    const after = computeSubjectGrade([...others, hypo], subject.config)
    return { before, after: after.grade, pct: after.percentage }
    // payload is derived from the listed state values
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subject, status, counts, dueOn, criteria, rawScore, maxScore, weight, componentId, initial?.id, isMyp])

  if (subjects.length === 0) {
    return (
      <div className="space-y-3 py-2 text-sm">
        <p>Add a subject first, then you can log its summatives and exams.</p>
        <Link href="/subjects?new=1" onClick={onDone} className="font-medium text-primary hover:underline">
          Add a subject
        </Link>
      </div>
    )
  }

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(undefined)
    start(async () => {
      const r = await saveAssessment(payload)
      if (!r.ok) {
        setErrors(r.fieldErrors ?? {})
        setFormError(r.error)
        return
      }
      setErrors({})
      const change =
        r.after != null && r.before !== r.after
          ? ` · ${r.subjectName} is now ${r.after}${r.before != null ? ` (${r.after > r.before ? "+" : ""}${r.after - r.before})` : ""}`
          : ""
      toast.success(`${initial ? "Updated" : "Saved"} “${title.trim()}”${change}`)
      onDone?.()
    })
  }

  return (
    <form onSubmit={submit} className="grid gap-4" noValidate>
      <FormMessage status="error" message={formError} />

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField id="a-subject" label="Subject" error={errors.subjectId}>
          {(p) => (
            <NativeSelect {...p} value={subjectId} onChange={(e) => setSubjectId(e.target.value)}>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </NativeSelect>
          )}
        </FormField>
        <FormField id="a-kind" label="Type">
          {(p) => (
            <NativeSelect {...p} value={kind} onChange={(e) => setKind(e.target.value as typeof kind)}>
              {ASSESSMENT_KINDS.map((k) => (
                <option key={k} value={k}>
                  {KIND_LABEL[k]}
                </option>
              ))}
            </NativeSelect>
          )}
        </FormField>
      </div>

      <FormField id="a-title" label="Task name" error={errors.title} required>
        {(p) => <Input {...p} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Unit 3 lab report" maxLength={160} />}
      </FormField>

      <div className="grid gap-4 sm:grid-cols-2">
        <fieldset className="grid gap-1.5">
          <legend className="mb-1.5 text-sm font-medium">Status</legend>
          <div className="grid h-9 grid-cols-2 rounded-ele border bg-muted p-0.5" role="radiogroup">
            {(["graded", "upcoming"] as const).map((s) => (
              <label
                key={s}
                className="grid cursor-pointer place-items-center rounded-[6px] text-sm font-medium text-muted-foreground has-[:checked]:bg-card has-[:checked]:text-foreground has-[:checked]:shadow-sm has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring"
              >
                <input type="radio" name="a-status" value={s} checked={status === s} onChange={() => setStatus(s)} className="sr-only" />
                {s === "graded" ? "Graded" : "Upcoming"}
              </label>
            ))}
          </div>
        </fieldset>
        <FormField id="a-date" label={status === "graded" ? "Date" : "Due date"} error={errors.dueOn}>
          {(p) => <Input {...p} type="date" value={dueOn} onChange={(e) => setDueOn(e.target.value)} />}
        </FormField>
      </div>

      {status === "graded" &&
        (isMyp ? (
          <fieldset className="grid gap-1.5">
            <legend className="mb-1.5 text-sm font-medium">Criterion levels (0–8)</legend>
            <div className="grid grid-cols-4 gap-2">
              {CRITERIA.map((c) => (
                <div key={c} className="grid gap-1">
                  <label htmlFor={`a-crit-${c}`} className="text-xs text-muted-foreground">
                    Criterion {c}
                  </label>
                  <NativeSelect
                    id={`a-crit-${c}`}
                    value={criteria[c]}
                    onChange={(e) => setCriteria((v) => ({ ...v, [c]: e.target.value }))}
                    className="font-mono tabular"
                    aria-invalid={errors.criteria ? true : undefined}
                  >
                    <option value="">–</option>
                    {Array.from({ length: 9 }, (_, i) => (
                      <option key={i} value={i}>
                        {i}
                      </option>
                    ))}
                  </NativeSelect>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">Leave a criterion as “–” if this task didn’t assess it.</p>
            {errors.criteria && <p className="text-xs font-medium text-destructive">{errors.criteria}</p>}
          </fieldset>
        ) : (
          <div className="grid gap-4 sm:grid-cols-[1fr_1fr_0.8fr]">
            <FormField id="a-raw" label="Score" error={errors.rawScore ?? errors.criteria}>
              {(p) => <Input {...p} type="number" inputMode="decimal" min={0} step="any" value={rawScore} onChange={(e) => setRawScore(e.target.value)} className="font-mono" />}
            </FormField>
            <FormField id="a-max" label="Out of" error={errors.maxScore}>
              {(p) => <Input {...p} type="number" inputMode="decimal" min={0} step="any" value={maxScore} onChange={(e) => setMaxScore(e.target.value)} className="font-mono" />}
            </FormField>
            <FormField id="a-weight" label="Weight" hint="Relative">
              {(p) => <Input {...p} type="number" inputMode="decimal" min={0.1} max={100} step="any" value={weight} onChange={(e) => setWeight(e.target.value)} className="font-mono" />}
            </FormField>
          </div>
        ))}

      {!isMyp && subject && subject.components.length > 0 && (
        <FormField id="a-component" label="Component" hint="Which part of the course this counts towards">
          {(p) => (
            <NativeSelect {...p} value={componentId} onChange={(e) => setComponentId(e.target.value)}>
              <option value="">Not assigned</option>
              {subject.components.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({Number(c.weight)}%)
                </option>
              ))}
            </NativeSelect>
          )}
        </FormField>
      )}

      <label className="flex items-center justify-between gap-4 rounded-lg border bg-field px-3 py-2.5">
        <span>
          <span className="block text-sm font-medium">Counts toward my grade</span>
          <span className="block text-xs text-muted-foreground">Turn off for practice tasks and formatives.</span>
        </span>
        <Switch checked={counts} onCheckedChange={(v) => setCounts(Boolean(v))} aria-label="Counts toward my grade" />
      </label>

      <FormField id="a-notes" label="Notes" hint="Optional: teacher feedback or what to improve.">
        {(p) => <Textarea {...p} value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} maxLength={2000} />}
      </FormField>

      <div className="flex flex-col-reverse items-stretch gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
        <div aria-live="polite" className="min-h-6 text-sm">
          {preview && (
            <span className="inline-flex items-center gap-2 text-muted-foreground">
              {subject?.name}:
              <GradeNumber grade={preview.before} size="sm" className="text-muted-foreground" />
              <ArrowRight className="size-3.5" aria-hidden="true" />
              <GradeNumber
                grade={preview.after}
                size="sm"
                className={cn(
                  "text-foreground",
                  preview.before != null && preview.after != null && preview.after > preview.before && "text-success-text",
                  preview.before != null && preview.after != null && preview.after < preview.before && "text-decline-text",
                )}
              />
            </span>
          )}
        </div>
        <Button type="submit" size="lg" disabled={pending} className="h-10 px-4">
          {pending && <Loader2 className="animate-spin" aria-hidden="true" />}
          {initial ? "Save changes" : "Add assessment"}
        </Button>
      </div>
    </form>
  )
}
