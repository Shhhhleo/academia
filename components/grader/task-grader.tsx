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
import { builtInRubric, TASK_TYPES, type GradeResult, type TaskType } from "@/lib/grader/rubrics"
import { SUBJECT_GROUPS } from "@/lib/ib"

const OTHER = "__other"
const label = "mb-1.5 block text-sm font-medium"
const MAX_TEXT = 200_000 // matches gradeRequest.text

class UserError extends Error {}

// Read files in the browser and send only text: Vercel rejects request bodies over 4.5 MB.
async function fileText(file: File): Promise<string> {
  const isPdf = file.type === "application/pdf" || /\.pdf$/i.test(file.name)
  const isDocx = /\.docx$/i.test(file.name)
  const isText = file.type.startsWith("text/") || /\.(txt|md)$/i.test(file.name)
  if (!isPdf && !isDocx && !isText) {
    throw new UserError("Upload a PDF, Word (.docx) or .txt file. Photos of handwriting can't be read, so type or paste the text instead.")
  }
  try {
    const data = await file.arrayBuffer()
    if (isPdf) {
      const { extractText } = await import("unpdf")
      return (await extractText(new Uint8Array(data), { mergePages: true })).text
    }
    if (isDocx) {
      const { default: mammoth } = await import("mammoth")
      return (await mammoth.extractRawText({ arrayBuffer: data })).value
    }
    return new TextDecoder().decode(data)
  } catch (err) {
    console.error("grader: could not read file", err)
    throw new UserError("That file couldn't be opened. Try saving it again as PDF or Word, or paste the text.")
  }
}

export function TaskGrader() {
  const { subjects, profile } = useShell()
  const [subjectId, setSubjectId] = useState(subjects[0]?.id ?? OTHER)
  const subject = subjects.find((s) => s.id === subjectId)
  const [programme, setProgramme] = useState<"MYP" | "DP">(profile.programme)
  const prog = subject?.programme ?? programme
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<GradeResult | null>(null)
  const [taskType, setTaskType] = useState<TaskType>(TASK_TYPES[0])
  const [otherGroup, setOtherGroup] = useState("")
  const [otherName, setOtherName] = useState("")
  const preview = subject
    ? builtInRubric(subject.programme, subject.subject_group ?? undefined, taskType, subject.name)
    : builtInRubric(programme, otherGroup || undefined, taskType, otherName)

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    if (subject) {
      fd.set("programme", subject.programme)
      fd.set("subjectName", subject.name)
      if (subject.subject_group) fd.set("subjectGroup", subject.subject_group)
      fd.set("level", subject.level)
    }
    const ticked = fd.getAll("criterion").map(String)
    fd.delete("criterion")
    if (ticked.length) fd.set("criteria", ticked.join(","))
    setBusy(true)
    setError(null)
    setResult(null)
    try {
      const file = fd.get("file")
      fd.delete("file")
      if (file instanceof File && file.size > 0) {
        const read = await fileText(file)
        const pasted = String(fd.get("text") ?? "")
        if (!read.trim() && !pasted.trim()) {
          throw new UserError("No text found in that file. If it's a scanned PDF, upload a typed version or paste the text.")
        }
        // shortcut: grades the first 200k characters (schema cap); raise both if longer work must be graded.
        fd.set("text", `${read}\n\n${pasted}`.slice(0, MAX_TEXT))
      }
      const res = await fetch("/api/grader", { method: "POST", body: fd })
      const json = await res.json().catch(() => null)
      if (!res.ok) setError(json?.error ?? "Something went wrong while grading. Try again.")
      else setResult(json as GradeResult)
    } catch (err) {
      setError(err instanceof UserError ? err.message : "Couldn't reach the grader. Check your connection and try again.")
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
                <NativeSelect
                  id="g-programme"
                  name="programme"
                  value={programme}
                  onChange={(e) => {
                    setProgramme(e.target.value as "MYP" | "DP")
                    setOtherGroup("")
                  }}
                >
                  <option value="MYP">MYP</option>
                  <option value="DP">DP</option>
                </NativeSelect>
              </div>
              <div>
                <label htmlFor="g-group" className={label}>Subject group</label>
                <NativeSelect id="g-group" name="subjectGroup" value={otherGroup} onChange={(e) => setOtherGroup(e.target.value)}>
                  <option value="">Work it out from the name</option>
                  {SUBJECT_GROUPS[programme].map((g) => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </NativeSelect>
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="g-name" className={label}>Subject name</label>
                <Input id="g-name" name="subjectName" required maxLength={120} value={otherName} onChange={(e) => setOtherName(e.target.value)} placeholder="e.g. English Language and Literature" />
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
              <NativeSelect id="g-type" name="taskType" value={taskType} onChange={(e) => setTaskType(e.target.value as TaskType)}>
                {TASK_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </NativeSelect>
            </div>
          </div>

          {/* key: ticks reset when the subject or task type changes the criteria. */}
          <fieldset key={preview.label} aria-describedby="g-criteria-hint">
            <legend className={label}>Criteria this task assesses (optional)</legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {preview.criteria.map((c) => (
                <label key={c.id} className="flex items-start gap-2 text-sm">
                  <input type="checkbox" name="criterion" value={c.id} className="mt-0.5 size-4 shrink-0 accent-[var(--primary)]" />
                  <span>
                    <span className="font-medium">{c.id}</span> {c.name}
                  </span>
                </label>
              ))}
            </div>
            <p id="g-criteria-hint" className="mt-1 text-xs text-muted-foreground">Tick only the criteria your teacher is marking. Leave all unticked to grade every criterion.</p>
          </fieldset>

          <div>
            <label htmlFor="g-task" className={label}>The task or question (optional)</label>
            <Textarea id="g-task" name="task" rows={3} maxLength={5_000} aria-describedby="g-task-hint" placeholder="e.g. Analyse how the poet uses imagery to present grief." />
            <p id="g-task-hint" className="mt-1 text-xs text-muted-foreground">Paste the question or instructions your teacher set, so the grade checks you answered that task.</p>
          </div>

          <div>
            <label htmlFor="g-file" className={label}>Upload your work</label>
            <Input id="g-file" name="file" type="file" accept=".pdf,.docx,.txt,.md" aria-describedby="g-file-hint" />
            <p id="g-file-hint" className="mt-1 text-xs text-muted-foreground">PDF, Word (.docx) or .txt. Read on your device, so any size works. Google Docs: download as .docx or PDF.</p>
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
              {preview && (
                <p className="text-xs">
                  {preview.label}: {preview.criteria.map((c) => `${c.id} ${c.name}`).join(" · ")}
                </p>
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
