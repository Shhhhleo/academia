import { readdirSync, readFileSync } from "node:fs"
import { join } from "node:path"
import { fileURLToPath } from "node:url"
import { gradeRequest } from "./rubrics"
import { gradeTask } from "./score"

/**
 * Harness for the blind test set: sample student work for every MYP and DP rubric at three levels, written and marked
 * (as an IB teacher would) without sight of the grader. Set GRADER_REPORT to a file path for a full table.
 */
export interface Sample {
  set: string
  task: string
  level: "strong" | "mid" | "weak"
  criteria: string[]
  expect: Record<string, number>
  text: string
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
export const samples: Sample[] = readdirSync(dir).flatMap((f) => JSON.parse(readFileSync(join(dir, f), "utf8")) as Sample[])

export function grade(s: Sample) {
  const info = SETS[s.set]
  const words = s.text.split(/\s+/).length
  const text = info.full ? Array.from({ length: Math.ceil(info.full / words) }, () => s.text).join("\n\n") : s.text
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
export const gradeAll = () => samples.flatMap((s) => grade(s).map((m) => ({ ...m, set: s.set, level: s.level })))
/** Within one mark on a short scale, or a fifth of a longer one. */
export const close = (m: { got: number; want: number; max: number }) => Math.abs(m.got - m.want) <= Math.max(1, Math.floor(m.max * 0.2))
export const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / Math.max(1, xs.length)
