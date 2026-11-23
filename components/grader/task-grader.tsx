"use client"

import { useRef, useState, type DragEvent, type FormEvent, type ReactNode } from "react"
import { AlertCircle, Check, ChevronDown, FileText, Loader2, Lock, Sparkles, Upload, X } from "lucide-react"
import { cn } from "cn"
import { useShell } from "@/components/app/shell-context"
import { Panel } from "@/components/app/page-header"
import { GradeNumber } from "@/components/grades/grade-badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { NativeSelect } from "@/components/ui/native-select"
import { Progress, ProgressLabel } from "@/components/ui/progress"
import { Textarea } from "@/components/ui/textarea"
import { AiFeedback } from "@/components/grader/ai-feedback"
import { matchTask } from "@/lib/grader/ai/client"
import type { FeedbackInput } from "@/lib/grader/ai/prompt"
import { builtInRubric, isLanguageGroup, taskExample, taskTypesFor, WRITING_MODES, type GradeResult, type TaskType } from "@/lib/grader/rubrics"
import { SUBJECT_GROUPS } from "@/lib/ib"

const OTHER = "__other"
const label = "mb-1.5 block text-sm font-medium"
const hint = "mt-1.5 text-xs text-muted-foreground"
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

type Stage = "reading" | "matching" | "grading"
const STAGE_TEXT: Record<Stage, string> = { reading: "Reading your file…", matching: "Checking it answers the task…", grading: "Grading…" }

/** A numbered group of fields. */
function Step({ n, title, children }: { n: number; title: string; children: ReactNode }) {
  return (
    <fieldset className="grid gap-4">
      <legend className="mb-3 flex items-center gap-2.5 text-sm font-semibold">
        <span className="grid size-6 place-items-center rounded-full bg-primary/15 text-xs text-primary tabular" aria-hidden="true">
          {n}
        </span>
        {title}
      </legend>
      {children}
    </fieldset>
  )
}

export function TaskGrader() {
  const { subjects, profile } = useShell()
  const [subjectId, setSubjectId] = useState(subjects[0]?.id ?? OTHER)
  const subject = subjects.find((s) => s.id === subjectId)
  const [programme, setProgramme] = useState<"MYP" | "DP">(profile.programme)
  const prog = subject?.programme ?? programme
  const [stage, setStage] = useState<Stage | null>(null)
  const [steps, setSteps] = useState<Stage[]>([])
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<GradeResult | null>(null)
  const [feedback, setFeedback] = useState<FeedbackInput | null>(null)
  const [gradeNo, setGradeNo] = useState(0)
  const [chosenType, setChosenType] = useState<TaskType>("Summative assessment")
  const [otherGroup, setOtherGroup] = useState("")
  const [otherName, setOtherName] = useState("")
  const [ticked, setTicked] = useState<{ rubric: string; ids: string[] }>({ rubric: "", ids: [] })
  const [fileName, setFileName] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  // Everything below follows the subject: its group decides the task types, the criteria and the examples.
  const group = (subject ? builtInRubric(subject.programme, subject.subject_group ?? undefined, "Other", subject.name) : builtInRubric(programme, otherGroup || undefined, "Other", otherName)).group
  const taskTypes = taskTypesFor(prog, group)
  const taskType = taskTypes.includes(chosenType) ? chosenType : taskTypes[0]
  const preview = subject
    ? builtInRubric(subject.programme, subject.subject_group ?? undefined, taskType, subject.name)
    : builtInRubric(programme, otherGroup || undefined, taskType, otherName)
  const languageSubject = isLanguageGroup(group)
  // Ticks belong to one set of criteria; a different subject or task type starts again.
  const tickedIds = ticked.rubric === preview.label ? ticked.ids : []
  const busy = stage !== null

  function toggle(id: string) {
    setTicked({ rubric: preview.label, ids: tickedIds.includes(id) ? tickedIds.filter((t) => t !== id) : [...tickedIds, id] })
  }

  function pickFile(file: File | undefined) {
    if (!file || !fileRef.current) return
    const dt = new DataTransfer()
    dt.items.add(file)
    fileRef.current.files = dt.files
    setFileName(file.name)
  }

  function onDrop(e: DragEvent<HTMLLabelElement>) {
    e.preventDefault()
    setDragging(false)
    pickFile(e.dataTransfer.files[0])
  }

  function clearFile() {
    if (fileRef.current) fileRef.current.value = ""
    setFileName(null)
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    if (subject) {
      fd.set("programme", subject.programme)
      fd.set("subjectName", subject.name)
      if (subject.subject_group) fd.set("subjectGroup", subject.subject_group)
      fd.set("level", subject.level)
    }
    if (tickedIds.length) fd.set("criteria", tickedIds.join(","))
    setError(null)
    setResult(null)
    try {
      const file = fd.get("file")
      fd.delete("file")
      const hasFile = file instanceof File && file.size > 0
      setSteps([...(hasFile ? (["reading"] as const) : []), ...(String(fd.get("task") ?? "").trim() ? (["matching"] as const) : []), "grading"])
      if (hasFile) {
        setStage("reading")
        const read = await fileText(file)
        const pasted = String(fd.get("text") ?? "")
        if (!read.trim() && !pasted.trim()) {
          throw new UserError("No text found in that file. If it's a scanned PDF, upload a typed version or paste the text.")
        }
        // shortcut: grades the first 200k characters (schema cap); raise both if longer work must be graded.
        fd.set("text", `${read}\n\n${pasted}`.slice(0, MAX_TEXT))
      }
      const task = String(fd.get("task") ?? "")
      const work = String(fd.get("text") ?? "")
      if (!work.trim()) throw new UserError("Add your work: upload a file or paste it in.")
      // Meaning match on this device (small open-source model); without it the grader matches the task's words.
      if (task.trim()) {
        setStage("matching")
        const match = await matchTask(task, work)
        if (match !== null) fd.set("taskMatch", match.toFixed(3))
      }
      setStage("grading")
      const res = await fetch("/api/grader", { method: "POST", body: fd })
      const json = await res.json().catch(() => null)
      if (!res.ok) setError(json?.error ?? "Something went wrong while grading. Try again.")
      else {
        const graded = json as GradeResult
        setResult(graded)
        setFeedback(
          work.trim().split(/\s+/).length >= 20
            ? {
                programme: String(fd.get("programme")) === "DP" ? "DP" : "MYP",
                year: Number(fd.get("year")) || 1,
                subjectName: String(fd.get("subjectName") ?? ""),
                taskType,
                mode: graded.mode,
                task,
                criteria: graded.criteria.map(({ id, name, score, max }) => ({ id, name, score, max })),
                text: work,
              }
            : null,
        )
        setGradeNo((n) => n + 1)
      }
    } catch (err) {
      setError(err instanceof UserError ? err.message : "Couldn't reach the grader. Check your connection and try again.")
    } finally {
      setStage(null)
    }
  }

  const defaultYear = Math.min(Math.max(profile.year_level ?? 1, 1), prog === "DP" ? 2 : 5)
  const rubricExample = preview.criteria
    .slice(0, 2)
    .map((c) => `Criterion ${c.id}: ${c.name} (0–${c.max})`)
    .join("\n")

  return (
    <div className="grid items-start gap-4 lg:grid-cols-5">
      <Panel title="Grade a task" description="Three quick steps. Nothing is saved." className="lg:col-span-2">
        <form onSubmit={onSubmit} className="grid gap-7" aria-busy={busy}>
          <Step n={1} title="The task">
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
                  <Input id="g-name" name="subjectName" required maxLength={120} value={otherName} onChange={(e) => setOtherName(e.target.value)} placeholder="e.g. Physics" />
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

            <div className="grid gap-3 sm:grid-cols-[8rem_1fr]">
              <div>
                <label htmlFor="g-year" className={label}>Year</label>
                <NativeSelect id="g-year" name="year" defaultValue={defaultYear} key={prog}>
                  {Array.from({ length: prog === "DP" ? 2 : 5 }, (_, i) => (
                    <option key={i + 1} value={i + 1}>{prog} {i + 1}</option>
                  ))}
                </NativeSelect>
              </div>
              <div>
                <label htmlFor="g-type" className={label}>Task type</label>
                <NativeSelect id="g-type" name="taskType" value={taskType} onChange={(e) => setChosenType(e.target.value as TaskType)}>
                  {taskTypes.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </NativeSelect>
              </div>
            </div>

            {languageSubject && (
              <div>
                <label htmlFor="g-mode" className={label}>Type of writing</label>
                <NativeSelect id="g-mode" name="mode" defaultValue="" aria-describedby="g-mode-hint">
                  <option value="">Work it out from the task or the writing</option>
                  {Object.entries(WRITING_MODES).map(([value, text]) => (
                    <option key={value} value={value}>{text}</option>
                  ))}
                </NativeSelect>
                <p id="g-mode-hint" className={hint}>A story is marked on storytelling, a speech on persuasion, an essay on analysis.</p>
              </div>
            )}
          </Step>

          <Step n={2} title="What's being marked">
            <div role="group" aria-labelledby="g-criteria-label" aria-describedby="g-criteria-hint">
              <p id="g-criteria-label" className={label}>
                {preview.label}
              </p>
              <div className="grid gap-2 sm:grid-cols-2">
                {preview.criteria.map((c) => {
                  const on = tickedIds.includes(c.id)
                  return (
                    <label
                      key={c.id}
                      className={cn(
                        "flex min-h-11 cursor-pointer items-start gap-3 rounded-lg border p-3 text-sm transition-colors hover:bg-muted/60 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring",
                        on && "border-primary bg-primary/10 hover:bg-primary/15",
                      )}
                    >
                      <input type="checkbox" className="sr-only" checked={on} onChange={() => toggle(c.id)} />
                      <span
                        className={cn(
                          "grid size-6 shrink-0 place-items-center rounded-md border font-mono text-xs font-semibold",
                          on && "border-primary bg-primary text-primary-foreground",
                        )}
                        aria-hidden="true"
                      >
                        {on ? <Check className="size-3.5" /> : c.id}
                      </span>
                      <span className="leading-snug">
                        {c.name}
                        <span className="block text-xs text-muted-foreground">
                          Criterion {c.id} · out of {c.max}
                        </span>
                      </span>
                    </label>
                  )
                })}
              </div>
              <p id="g-criteria-hint" className={hint} aria-live="polite">
                {tickedIds.length && tickedIds.length < preview.criteria.length
                  ? `Grading ${[...tickedIds].sort().join(", ")} only, with feedback on just ${tickedIds.length === 1 ? "that one" : "those"}.`
                  : `Grading all ${preview.criteria.length} criteria. Tick only the ones your teacher is marking.`}
              </p>
            </div>

            <details className="group rounded-lg border">
              <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 rounded-lg px-3 text-sm font-medium hover:bg-muted/60 [&::-webkit-details-marker]:hidden">
                Use your teacher&apos;s rubric instead
                <ChevronDown className="size-4 text-muted-foreground transition-transform group-open:rotate-180" aria-hidden="true" />
              </summary>
              <div className="border-t p-3">
                <label htmlFor="g-brief" className={label}>Teacher&apos;s rubric</label>
                <Textarea id="g-brief" name="rubric" rows={4} maxLength={20_000} aria-describedby="g-brief-hint" placeholder={rubricExample} />
                <p id="g-brief-hint" className={hint}>One criterion per line, with its maximum mark. Leave empty to use the IB criteria above.</p>
              </div>
            </details>
          </Step>

          <Step n={3} title="Your work">
            <div>
              <label htmlFor="g-task" className={label}>
                The task or question <span className="font-normal text-muted-foreground">(optional)</span>
              </label>
              <Textarea id="g-task" name="task" rows={2} maxLength={5_000} aria-describedby="g-task-hint" placeholder={`e.g. ${taskExample(group)}`} />
              <p id="g-task-hint" className={hint}>
                Paste what your teacher asked, so the grade checks you answered it.
              </p>
            </div>

            <div>
              <span className={label} id="g-file-label">Upload your work</span>
              <label
                htmlFor="g-file"
                onDragOver={(e) => {
                  e.preventDefault()
                  setDragging(true)
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={onDrop}
                className={cn(
                  "flex min-h-24 cursor-pointer flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed p-4 text-center text-sm transition-colors hover:bg-muted/60 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring",
                  dragging && "border-primary bg-primary/10",
                  fileName && "border-solid",
                )}
              >
                <input
                  ref={fileRef}
                  id="g-file"
                  name="file"
                  type="file"
                  accept=".pdf,.docx,.txt,.md"
                  className="sr-only"
                  aria-labelledby="g-file-label"
                  aria-describedby="g-file-hint"
                  onChange={(e) => setFileName(e.target.files?.[0]?.name ?? null)}
                />
                {fileName ? (
                  <span className="flex max-w-full items-center gap-2 font-medium">
                    <FileText className="size-4 shrink-0 text-primary" aria-hidden="true" />
                    <span className="[overflow-wrap:anywhere]">{fileName}</span>
                  </span>
                ) : (
                  <>
                    <Upload className="size-5 text-muted-foreground" aria-hidden="true" />
                    <span>
                      <span className="font-medium text-primary">Choose a file</span> or drag it here
                    </span>
                  </>
                )}
                <span id="g-file-hint" className="text-xs text-muted-foreground">
                  PDF, Word or .txt · read on your device, any size
                </span>
              </label>
              {fileName && (
                <button type="button" onClick={clearFile} className="mt-1.5 inline-flex min-h-6 items-center gap-1 text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline">
                  <X className="size-3" aria-hidden="true" />
                  Remove file
                </button>
              )}
            </div>

            <div>
              <label htmlFor="g-text" className={label}>
                {fileName ? "Anything to add" : "Or paste it here"}
              </label>
              <Textarea id="g-text" name="text" rows={5} maxLength={200_000} placeholder="Paste your essay, report or answers" />
            </div>
          </Step>

          <div className="grid gap-3">
            {error && (
              <p role="alert" className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                {error}
              </p>
            )}
            <Button type="submit" size="lg" className="h-11 w-full" disabled={busy}>
              {busy ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <Sparkles className="size-4" aria-hidden="true" />}
              {stage ? STAGE_TEXT[stage] : "Grade my task"}
            </Button>
            {stage && (
              // Each step is shown half done: how long a step takes isn't known.
              <Progress value={Math.round(((steps.indexOf(stage) + 0.5) / steps.length) * 100)}>
                <ProgressLabel>{STAGE_TEXT[stage]}</ProgressLabel>
                <span className="ml-auto text-sm text-muted-foreground tabular-nums">
                  Step {steps.indexOf(stage) + 1} of {steps.length}
                </span>
              </Progress>
            )}
            <p className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
              <Lock className="size-3" aria-hidden="true" />
              Your work is read on your device and never saved.
            </p>
          </div>
        </form>
      </Panel>

      <div className="lg:col-span-3" aria-live="polite">
        {result ? (
          <Evaluation result={result} feedback={feedback && <AiFeedback key={gradeNo} input={feedback} />} />
        ) : (
          <Panel>
            <div className="grid gap-5 py-6">
              <div className="grid place-items-center gap-2 text-center">
                <span className="grid size-12 place-items-center rounded-full bg-primary/10 text-primary">
                  <Sparkles className="size-5" aria-hidden="true" />
                </span>
                <p className="font-medium">Your evaluation appears here</p>
                <p className="max-w-sm text-sm text-muted-foreground">A grade for each criterion, what you did well, and what to change to reach the next band.</p>
              </div>
              <div className="mx-auto w-full max-w-md">
                <p className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">{preview.label}</p>
                <ul className="divide-y rounded-lg border text-sm">
                  {preview.criteria.map((c) => {
                    const skipped = tickedIds.length > 0 && !tickedIds.includes(c.id)
                    return (
                      <li key={c.id} className={cn("flex items-center gap-3 px-3 py-2.5", skipped && "text-muted-foreground")}>
                        <span className="grid size-6 shrink-0 place-items-center rounded-md bg-muted font-mono text-xs font-semibold">{c.id}</span>
                        <span className="flex-1">{c.name}</span>
                        <span className="text-xs text-muted-foreground tabular">{skipped ? "Not marked" : `/${c.max}`}</span>
                      </li>
                    )
                  })}
                </ul>
              </div>
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

function Evaluation({ result, feedback }: { result: GradeResult; feedback: ReactNode }) {
  return (
    <div className="grid gap-4">
      <Panel title="Estimated grade">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <GradeNumber grade={result.overall_grade} size="xl" />
          <p className="text-sm">{result.summary}</p>
        </div>
      </Panel>

      {feedback}

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
