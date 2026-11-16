"use client"

import { useState, type FormEvent } from "react"
import { FileUp, Loader2, Sparkles } from "lucide-react"
import { useShell } from "@/components/app/shell-context"
import { Panel } from "@/components/app/page-header"
import { GradeNumber } from "@/components/grades/grade-badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { NativeSelect } from "@/components/ui/native-select"
import { Textarea } from "@/components/ui/textarea"
import { MYP_RUBRICS, TASK_TYPES, type GradeResult } from "@/lib/grader/rubrics"
import { SUBJECT_GROUPS } from "@/lib/ib"

const OTHER = "__other"
const label = "mb-1.5 block text-sm font-medium"

export function TaskGrader() {
  const { subjects, profile } = useShell()
  const [subjectId, setSubjectId] = useState(subjects[0]?.id ?? OTHER)
  const subject = subjects.find((s) => s.id === subjectId)
  const [programme, setProgramme] = useState<"MYP" | "DP">(profile.programme)
  const prog = subject?.programme ?? programme
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<GradeResult | null>(null)

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    if (subject) {
      fd.set("programme", subject.programme)
      fd.set("subjectName", subject.name)
      if (subject.subject_group) fd.set("subjectGroup", subject.subject_group)
      fd.set("level", subject.level)
    }
    setBusy(true)
    setError(null)
    setResult(null)
    try {
      const res = await fetch("/api/grader", { method: "POST", body: fd })
      const json = await res.json().catch(() => null)
      if (!res.ok) setError(json?.error ?? "Something went wrong while grading. Try again.")
      else setResult(json as GradeResult)
    } catch {
      setError("Couldn't reach the grader. Check your connection and try again.")
    } finally {
      setBusy(false)
    }
  }

  const defaultYear = Math.min(Math.max(profile.year_level ?? 1, 1), prog === "DP" ? 2 : 5)

  return (
    <div className="grid gap-4 lg:grid-cols-5">
      <Panel title="Your task" description="Upload the work and tell the grader what it is. Nothing is saved." className="lg:col-span-2">
        <form onSubmit={onSubmit} className="grid gap-4">
          <div>
            <label htmlFor="g-subject" className={label}>Subject</label>
            <NativeSelect id="g-subject" value={subjectId} onChange={(e) => setSubjectId(e.target.value)}>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
              <option value={OTHER}>Another subject…</option>
            </NativeSelect>
          </div>

          {!subject && (
            <div className="grid gap-3 rounded-lg border bg-surface-2/50 p-3 sm:grid-cols-2">
              <div>
                <label htmlFor="g-programme" className={label}>Programme</label>
                <NativeSelect id="g-programme" name="programme" value={programme} onChange={(e) => setProgramme(e.target.value as "MYP" | "DP")}>
                  <option value="MYP">MYP</option>
                  <option value="DP">DP</option>
                </NativeSelect>
              </div>
              <div>
                <label htmlFor="g-group" className={label}>Subject group</label>
                <NativeSelect id="g-group" name="subjectGroup" key={programme}>
                  {SUBJECT_GROUPS[programme].map((g) => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </NativeSelect>
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="g-name" className={label}>Subject name</label>
                <Input id="g-name" name="subjectName" required maxLength={120} placeholder="e.g. English Language and Literature" />
              </div>
              {programme === "DP" && (
                <div>
                  <label htmlFor="g-level" className={label}>Level</label>
                  <NativeSelect id="g-level" name="level">
                    <option value="SL">SL</option>
                    <option value="HL">HL</option>
                  </NativeSelect>
                </div>
              )}
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-[7rem_1fr]">
            <div>
              <label htmlFor="g-year" className={label}>{prog} year</label>
              <NativeSelect id="g-year" name="year" defaultValue={defaultYear} key={prog}>
                {Array.from({ length: prog === "DP" ? 2 : 5 }, (_, i) => (
                  <option key={i + 1} value={i + 1}>{prog} {i + 1}</option>
                ))}
              </NativeSelect>
            </div>
            <div>
              <label htmlFor="g-type" className={label}>Task type</label>
              <NativeSelect id="g-type" name="taskType">
                {TASK_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </NativeSelect>
            </div>
          </div>

          <div>
            <label htmlFor="g-file" className={label}>Upload your work</label>
            <Input id="g-file" name="file" type="file" accept=".pdf,.docx,.txt,.md" aria-describedby="g-file-hint" />
            <p id="g-file-hint" className="mt-1 text-xs text-muted-foreground">PDF, Word (.docx) or .txt, up to 4 MB. Google Docs: download as .docx or PDF.</p>
          </div>

          <div>
            <label htmlFor="g-text" className={label}>…or paste it here</label>
            <Textarea id="g-text" name="text" rows={5} maxLength={200_000} placeholder="Paste your essay or answers" />
          </div>

          <div>
            <label htmlFor="g-brief" className={label}>Your own rubric (optional)</label>
            <Textarea id="g-brief" name="rubric" rows={4} maxLength={20_000} placeholder={"Leave empty to use the IB rubric for this subject. Or paste your teacher's, one criterion per line:\nCriterion A: Analysing (0–8)\nCriterion B: Organizing (0–8)"} />
          </div>

          <Button type="submit" disabled={busy}>
            {busy ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <Sparkles className="size-4" aria-hidden="true" />}
            {busy ? "Grading…" : "Grade my task"}
          </Button>
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        </form>
      </Panel>

      <div className="lg:col-span-3" aria-live="polite">
        {result ? (
          <Evaluation result={result} />
        ) : (
          <Panel>
            <div className="grid place-items-center gap-2 py-16 text-center text-sm text-muted-foreground">
              <FileUp className="size-8" aria-hidden="true" />
              <p>Your graded evaluation appears here, criterion by criterion.</p>
              {prog === "MYP" && subject?.subject_group && MYP_RUBRICS[subject.subject_group] && (
                <p className="text-xs">Criteria: {MYP_RUBRICS[subject.subject_group].map((c) => `${c.id} ${c.name}`).join(" · ")}</p>
              )}
            </div>
          </Panel>
        )}
      </div>
    </div>
  )
}

function List({ title, items }: { title: string; items: string[] }) {
  if (items.length === 0) return null
  return (
    <div>
      <h4 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">{title}</h4>
      <ul className="mt-1 list-disc space-y-1 pl-5 text-sm">
        {items.map((s, i) => <li key={i}>{s}</li>)}
      </ul>
    </div>
  )
}

function Evaluation({ result }: { result: GradeResult }) {
  return (
    <div className="grid gap-4">
      <Panel title="Estimated grade">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <GradeNumber grade={result.overall_grade} size="xl" />
          <p className="text-sm">{result.summary}</p>
        </div>
      </Panel>

      {result.criteria.map((c) => (
        <Panel key={c.id} title={`Criterion ${c.id}: ${c.name}`} action={<span className="font-mono text-lg font-semibold tabular">{c.score}<span className="text-sm text-muted-foreground">/{c.max}</span></span>}>
          <div className="grid gap-3">
            <div className="h-2 overflow-hidden rounded-full bg-muted" role="img" aria-label={`${c.score} out of ${c.max}`}>
              <div className="h-full rounded-full bg-primary" style={{ width: `${c.max ? Math.min(100, (c.score / c.max) * 100) : 0}%` }} />
            </div>
            <p className="text-sm"><span className="font-medium">Band {c.band}.</span> {c.justification}</p>
            <List title="Strengths" items={c.strengths} />
            <List title="To improve" items={c.improvements} />
          </div>
        </Panel>
      ))}

      <Panel title="Next steps">
        <ol className="list-decimal space-y-1 pl-5 text-sm">
          {result.next_steps.map((s, i) => <li key={i}>{s}</li>)}
        </ol>
        {result.caveats && <p className="mt-3 text-xs text-muted-foreground">Note: {result.caveats}</p>}
        <p className="mt-3 text-xs text-muted-foreground">This is an estimate against IB criteria, not an official mark. Your teacher&apos;s grade is what counts.</p>
      </Panel>
    </div>
  )
}
