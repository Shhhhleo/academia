import { readdirSync, readFileSync } from "node:fs"
import { join } from "node:path"
import { fileURLToPath } from "node:url"
import { gradeRequest } from "./rubrics"
import { featureVector, predict, ridge } from "./model"
import { gradeTask, TRACE } from "./score"
import { allCues, sections } from "./strands"

/**
 * Harness for the blind test set: sample student work for every MYP and DP rubric at three levels, written and marked
 * (as an IB teacher would) without sight of the grader. Set GRADER_REPORT to a file path for a full table.
 */
export interface Sample {
  set: string
  task: string
  level: "strong" | "good" | "mid" | "weak"
  /** normal, padded (long but thin), mismatch (addresses only some of the criteria it is graded on) or slides (text from a slide deck). */
  kind?: string
  /** Full-length work, graded as it is. Without it the sample is a condensed piece, repeated up to its real length. */
  asIs?: boolean
  criteria: string[]
  expect: Record<string, number>
  text: string
  /** 1: short and condensed samples. 2: full-length work, including padded, mismatched and slide-deck pieces. */
  round: number
  file: string
}

interface SetInfo {
  programme: "MYP" | "DP"
  subjectName: string
  subjectGroup: string
  taskType: string | ((s: Sample) => string)
  /** Words a complete piece runs to. The samples are condensed, so they are repeated up to this length. */
  full?: number
}

export const SETS: Record<string, SetInfo> = {
  "myp-langlit": { programme: "MYP", subjectName: "English", subjectGroup: "Language and literature", taskType: (s) => (s.criteria.includes("A") ? "Essay" : "Summative assessment") },
  "myp-langacq": { programme: "MYP", subjectName: "English Language Acquisition", subjectGroup: "Language acquisition", taskType: "Summative assessment" },
  "myp-is": { programme: "MYP", subjectName: "History", subjectGroup: "Individuals and societies", taskType: (s) => (s.criteria.includes("A") ? "Essay" : "Summative assessment") },
  "myp-sci": { programme: "MYP", subjectName: "Sciences", subjectGroup: "Sciences", taskType: (s) => (s.criteria.includes("B") ? "Lab report" : "Summative assessment") },
  "myp-math": { programme: "MYP", subjectName: "Mathematics", subjectGroup: "Mathematics", taskType: "Summative assessment" },
  "myp-arts": { programme: "MYP", subjectName: "Visual Arts", subjectGroup: "Arts", taskType: "Summative assessment" },
  "myp-phe": { programme: "MYP", subjectName: "PHE", subjectGroup: "Physical and health education", taskType: "Summative assessment" },
  "myp-design": { programme: "MYP", subjectName: "Design", subjectGroup: "Design", taskType: "Summative assessment" },
  "myp-pp": { programme: "MYP", subjectName: "Personal project", subjectGroup: "Personal project", taskType: "Project / portfolio" },
  "dp-langa-essay": { programme: "DP", subjectName: "English A: Language and Literature", subjectGroup: "Studies in language and literature", taskType: "Essay" },
  "dp-langa-io": { programme: "DP", subjectName: "English A: Language and Literature", subjectGroup: "Studies in language and literature", taskType: "Internal assessment (IA)", full: 1400 },
  "dp-langb-writing": { programme: "DP", subjectName: "English B", subjectGroup: "Language acquisition", taskType: "Summative assessment" },
  "dp-is-essay": { programme: "DP", subjectName: "History", subjectGroup: "Individuals and societies", taskType: "Essay", full: 840 },
  "dp-history-ia": { programme: "DP", subjectName: "History", subjectGroup: "Individuals and societies", taskType: "Internal assessment (IA)", full: 2200 },
  "dp-econ-ia": { programme: "DP", subjectName: "Economics", subjectGroup: "Individuals and societies", taskType: "Internal assessment (IA)", full: 750 },
  "dp-geog-ia": { programme: "DP", subjectName: "Geography", subjectGroup: "Individuals and societies", taskType: "Internal assessment (IA)", full: 2200 },
  "dp-generic-ia": { programme: "DP", subjectName: "Psychology", subjectGroup: "Individuals and societies", taskType: "Internal assessment (IA)", full: 2200 },
  "dp-ee": { programme: "DP", subjectName: "Extended Essay", subjectGroup: "Core (TOK / EE)", taskType: "Extended essay", full: 3500 },
  "dp-tok": { programme: "DP", subjectName: "Theory of Knowledge", subjectGroup: "Core (TOK / EE)", taskType: "TOK essay", full: 1400 },
  "dp-sci-ia": { programme: "DP", subjectName: "Chemistry", subjectGroup: "Sciences", taskType: "Internal assessment (IA)", full: 2200 },
  "dp-sci-exam": { programme: "DP", subjectName: "Biology", subjectGroup: "Sciences", taskType: "Past paper / exam answers" },
  "dp-math-ia": { programme: "DP", subjectName: "Mathematics AA", subjectGroup: "Mathematics", taskType: "Internal assessment (IA)", full: 2200 },
  "dp-math-exam": { programme: "DP", subjectName: "Mathematics AA", subjectGroup: "Mathematics", taskType: "Past paper / exam answers" },
  "dp-arts": { programme: "DP", subjectName: "Visual Arts", subjectGroup: "The arts", taskType: "Summative assessment" },
}

const dir = fileURLToPath(new URL("./samples", import.meta.url))
export const samples: Sample[] = readdirSync(dir).flatMap((f) => (JSON.parse(readFileSync(join(dir, f), "utf8")) as Sample[]).map((s) => ({ ...s, round: f.startsWith("r2") ? 2 : 1, file: f })))

/** The share of sections, across all the samples, in which each strand cue appears. Saved as cue-weights.json. */
export function cueFrequencies() {
  const all = samples.flatMap((s) => sections(s.text))
  return Object.fromEntries(allCues().map(({ alt, re }) => [alt, Math.round((all.filter((x) => x.search(re) >= 0).length / all.length) * 1000) / 1000]))
}

export function grade(s: Sample) {
  const info = SETS[s.set]
  const words = s.text.split(/\s+/).length
  const text = info.full && !s.asIs ? Array.from({ length: Math.ceil(info.full / words) }, () => s.text).join("\n\n") : s.text
  const r = gradeTask(
    gradeRequest.parse({
      programme: info.programme,
      subjectName: info.subjectName,
      subjectGroup: info.subjectGroup,
      year: info.programme === "MYP" ? "5" : "2",
      taskType: typeof info.taskType === "string" ? info.taskType : info.taskType(s),
      criteria: s.criteria.join(","),
      task: s.task,
      // The meaning model isn't available in tests; every sample is on task, as the model would report.
      taskMatch: "0.5",
    }),
    text,
  )
  return s.criteria.map((id) => {
    const c = r.criteria.find((x) => x.id === id)!
    return { id, got: c.score, max: c.max, want: s.expect[id] }
  })
}

/** Every teacher mark in the set next to the grader's mark. */
export const gradeAll = () => samples.flatMap((s) => grade(s).map((m) => ({ ...m, set: s.set, level: s.level, kind: s.kind ?? "normal", round: s.round, file: s.file })))
/** Within one mark on a short scale, or a fifth of a longer one. */
export const close = (m: { got: number; want: number; max: number }) => Math.abs(m.got - m.want) <= Math.max(1, Math.floor(m.max * 0.2))
export const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / Math.max(1, xs.length)

function traced(s: Sample, criteria = s.criteria) {
  TRACE.length = 0
  process.env.GRADER_TRACE = "1"
  const marks = grade({ ...s, criteria })
  delete process.env.GRADER_TRACE
  return { marks, trace: [...TRACE] }
}

/** The kinds of criterion the model is trained for. Stories and custom rubrics keep the hand-written formula. */
const GROUPS = ["language", "strand-content", "strand-organisation"]
const round = (n: number, places: number) => Math.round(n * 10 ** places) / 10 ** places

/** What the model is trained on: each teacher mark with the features of its criterion, and each criterion's background level. */
export function trainingData() {
  const levels: Record<string, number[]> = {}
  const rows = samples.flatMap((s) => {
    // Background level: how strongly a criterion shows in same-subject work that wasn't written for it.
    if (s.kind !== "mismatch") for (const t of traced(s, []).trace) if (!s.criteria.includes(t.id)) (levels[t.key] ??= []).push(t.features.top)
    const { marks, trace } = traced(s)
    return marks.map((m) => {
      const t = trace.find((x) => x.id === m.id)!
      return { ...m, set: s.set, level: s.level, kind: s.kind ?? "normal", round: s.round, file: s.file, key: t.key, group: t.group, cap: t.cap, features: t.features }
    })
  })
  const bg = Object.fromEntries(Object.entries(levels).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => [k, round(mean(v), 3)]))
  return { rows, bg, bgAll: round(mean(Object.values(levels).flat()), 3) }
}
type Data = ReturnType<typeof trainingData>

/** Learns the weights for each kind of criterion from the given marks. */
export function fit(data: Data, rows = data.rows) {
  return Object.fromEntries(
    GROUPS.flatMap((g) => {
      const rs = rows.filter((r) => r.group === g)
      if (rs.length < 20) return []
      const weights = ridge(rs.map((r) => featureVector(r.features, data.bg[r.key] ?? data.bgAll)), rs.map((r) => r.want / r.max))
      return [[g, weights.map((w) => round(w, 5))]]
    }),
  )
}

/** Marks from models that never saw the file being marked: each sample file is left out in turn. */
export function crossValidate(data: Data) {
  return [...new Set(data.rows.map((r) => r.file))].flatMap((file) => {
    const groups = fit(data, data.rows.filter((r) => r.file !== file))
    return data.rows
      .filter((r) => r.file === file && groups[r.group])
      .map((r) => ({ ...r, got: Math.round((predict(r.group, featureVector(r.features, data.bg[r.key] ?? data.bgAll), groups[r.group]) ?? 0) * r.cap * r.max) }))
  })
}
