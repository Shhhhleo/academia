import { readFileSync, writeFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { describe, expect, it } from "vitest"
import { close, crossValidate, cueFrequencies, fit, gradeAll, mean, samples, SETS, trainingData } from "./blind-harness"

/**
 * Blind test set: student work for every MYP and DP rubric, written and marked (as an IB teacher would) without
 * sight of the grader. Round 1 is short and condensed pieces; round 2 is full-length work, including padded pieces,
 * slide-deck text and work submitted for criteria it doesn't address.
 *
 * The marking model is trained on these marks. To retrain after changing cues, features or samples:
 *   UPDATE_CUE_WEIGHTS=1 npx vitest run lib/grader/blind.test.ts   (then again with UPDATE_MODEL=1)
 * Set GRADER_REPORT to a file path for a full table.
 */
type Row = { got: number; want: number; max: number; set: string; level: string; kind: string; round: number }
const file = (name: string) => fileURLToPath(new URL(name, import.meta.url))
const error = (rs: Row[]) => mean(rs.map((m) => Math.abs(m.got - m.want) / m.max))
const closeShare = (rs: Row[]) => rs.filter(close).length / Math.max(1, rs.length)
const marked = (rs: Row[], of: "got" | "want") => mean(rs.map((m) => m[of] / m.max))

const data = trainingData()
const model = { bg: data.bg, bgAll: data.bgAll, groups: fit(data) }
/** The grader as shipped, on work it was trained on. */
const fitted: Row[] = gradeAll()
/** Models that never saw the file they are marking: the honest measure. */
const unseen: Row[] = crossValidate(data)

if (process.env.GRADER_REPORT) {
  const line = (name: string, rs: Row[]) =>
    `${name.padEnd(20)} n ${String(rs.length).padStart(3)}  close ${String(Math.round(closeShare(rs) * 100)).padStart(3)}%  error ${(error(rs) * 100).toFixed(1).padStart(4)}%  teacher ${(marked(rs, "want") * 100).toFixed(0).padStart(2)}%  grader ${(marked(rs, "got") * 100).toFixed(0).padStart(2)}%`
  const table = (title: string, rows: Row[]) => [
    title,
    line("all", rows),
    line("round 1 (short)", rows.filter((m) => m.round === 1)),
    line("round 2 (full)", rows.filter((m) => m.round === 2)),
    ...["strong", "good", "mid", "weak"].map((l) => line(`  full, ${l}`, rows.filter((m) => m.round === 2 && m.level === l && m.kind === "normal"))),
    ...["padded", "mismatch", "slides"].map((k) => line(`  full, ${k}`, rows.filter((m) => m.kind === k))),
    ...Object.keys(SETS).map((set) => line(`  ${set}`, rows.filter((m) => m.set === set))),
    "",
  ]
  const lines = fitted.map((m) => `${close(m) ? "  " : "!!"} r${m.round} ${m.set.padEnd(18)} ${m.level.padEnd(6)} ${m.kind.padEnd(8)} teacher ${m.want}/${m.max}  grader ${m.got}/${m.max}`)
  writeFileSync(process.env.GRADER_REPORT, [...table("ON UNSEEN FILES (each file left out of training in turn)", unseen), ...table("AS SHIPPED (trained on all files)", fitted), ...lines].join("\n"))
}

describe("blind samples for every subject", () => {
  it("covers every set", () => {
    expect(samples.length).toBeGreaterThanOrEqual(220)
    for (const s of samples) expect(SETS[s.set], s.set).toBeDefined()
  })

  // Common cues ("because", "result") count for less than subject-specific ones. The weights are measured from the samples.
  it("has cue weights measured from the current samples and cues", () => {
    const fresh = cueFrequencies()
    if (process.env.UPDATE_CUE_WEIGHTS) writeFileSync(file("./cue-weights.json"), `${JSON.stringify(fresh, null, 1)}\n`)
    else expect(JSON.parse(readFileSync(file("./cue-weights.json"), "utf8")), "cues or samples changed: run once with UPDATE_CUE_WEIGHTS=1").toEqual(fresh)
  })

  it("ships the model trained on the current samples", () => {
    if (process.env.UPDATE_MODEL) writeFileSync(file("./model.json"), `${JSON.stringify(model, null, 1)}\n`)
    else expect(JSON.parse(readFileSync(file("./model.json"), "utf8")), "samples, cues or features changed: run once with UPDATE_MODEL=1").toEqual(model)
  })

  // Measured: 83% close and 12.9% error overall, 79% and 14.7% on full-length work.
  // The hand-set formula it replaced scored 69% and 18.2% on full-length work.
  it("stays close to the teacher's marks on files it was not trained on", () => {
    expect(closeShare(unseen)).toBeGreaterThanOrEqual(0.8)
    expect(error(unseen)).toBeLessThanOrEqual(0.14)
    const full = unseen.filter((m) => m.round === 2)
    expect(closeShare(full)).toBeGreaterThanOrEqual(0.75)
    expect(error(full)).toBeLessThanOrEqual(0.16)
  })

  it("stays close as shipped, overall and in every subject", () => {
    expect(closeShare(fitted)).toBeGreaterThanOrEqual(0.82)
    expect(error(fitted)).toBeLessThanOrEqual(0.125)
    for (const set of Object.keys(SETS)) expect(closeShare(fitted.filter((m) => m.set === set)), set).toBeGreaterThanOrEqual(0.6)
  })

  it("keeps full-length strong, middle and weak work apart", () => {
    const level = (l: string) => marked(fitted.filter((m) => m.round === 2 && m.level === l && m.kind === "normal"), "got")
    expect(level("strong")).toBeGreaterThanOrEqual(0.75)
    expect(level("mid")).toBeLessThanOrEqual(0.62)
    expect(level("weak")).toBeLessThanOrEqual(0.38)
    // Known weak spots, kept from getting worse: long but thin work, and criteria the work doesn't address.
    expect(error(fitted.filter((m) => m.kind === "padded"))).toBeLessThanOrEqual(0.23)
    expect(error(fitted.filter((m) => m.kind === "mismatch"))).toBeLessThanOrEqual(0.24)
  })
})
