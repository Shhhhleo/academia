import { writeFileSync } from "node:fs"
import { describe, expect, it } from "vitest"
import { close, gradeAll, mean, samples, SETS } from "./blind-harness"

/**
 * Blind test set: sample student work for every MYP and DP rubric at three levels, written and marked
 * (as an IB teacher would) without sight of the grader. Set GRADER_REPORT to a file path for a full table.
 */
const rows = gradeAll()
const share = (level: string, of: "got" | "want") => mean(rows.filter((m) => m.level === level).map((m) => m[of] / m.max))

if (process.env.GRADER_REPORT) {
  const lines = rows.map((m) => `${close(m) ? "  " : "!!"} ${m.set.padEnd(18)} ${m.level.padEnd(6)} ${m.id.padEnd(2)} teacher ${m.want}/${m.max}  grader ${m.got}/${m.max}`)
  const bySet = [...new Set(rows.map((m) => m.set))].map((set) => {
    const rs = rows.filter((m) => m.set === set)
    return `${set.padEnd(18)} close ${rs.filter(close).length}/${rs.length}  bias ${(mean(rs.map((m) => (m.got - m.want) / m.max)) * 100).toFixed(0)}%`
  })
  const summary = [
    `marks: ${rows.length}  close: ${rows.filter(close).length} (${Math.round((rows.filter(close).length / rows.length) * 100)}%)`,
    `mean error: ${(mean(rows.map((m) => Math.abs(m.got - m.want) / m.max)) * 100).toFixed(1)}% of the scale`,
    ...["strong", "mid", "weak"].map((l) => `${l.padEnd(6)} teacher ${(share(l, "want") * 100).toFixed(0)}%  grader ${(share(l, "got") * 100).toFixed(0)}%`),
  ]
  writeFileSync(process.env.GRADER_REPORT, [...summary, "", ...bySet, "", ...lines].join("\n"))
}

describe("blind samples for every subject", () => {
  it("covers every set", () => {
    expect(samples.length).toBeGreaterThanOrEqual(99)
    for (const s of samples) expect(SETS[s.set], s.set).toBeDefined()
  })

  // Fitted: 91% close, 10.9% mean error. The old keyword marking scored 62% and 23.1% on the same samples.
  it("stays close to the teacher's marks overall", () => {
    expect(rows.filter(close).length / rows.length).toBeGreaterThanOrEqual(0.87)
    expect(mean(rows.map((m) => Math.abs(m.got - m.want) / m.max))).toBeLessThanOrEqual(0.125)
  })

  it("stays close in every subject", () => {
    for (const set of Object.keys(SETS)) {
      const rs = rows.filter((m) => m.set === set)
      expect(rs.filter(close).length / rs.length, set).toBeGreaterThanOrEqual(0.65)
    }
  })

  it("marks strong work well above weak work at every level", () => {
    expect(share("strong", "got")).toBeGreaterThanOrEqual(0.85)
    expect(share("mid", "got")).toBeGreaterThan(0.45)
    expect(share("mid", "got")).toBeLessThan(0.7)
    expect(share("weak", "got")).toBeLessThanOrEqual(0.32)
    // Within each set and criterion, the strong sample never scores below the weak one.
    for (const m of rows.filter((x) => x.level === "strong")) {
      const weak = rows.find((x) => x.level === "weak" && x.set === m.set && x.id === m.id && x.max === m.max)
      if (weak) expect(m.got, `${m.set} ${m.id}`).toBeGreaterThanOrEqual(weak.got)
    }
  })
})
