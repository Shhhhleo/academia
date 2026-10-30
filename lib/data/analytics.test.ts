import { describe, expect, it } from "vitest"
import { criterionAverages, gradeDistribution, kindAverages, trendMatrix } from "./analytics"

const a = (over: Record<string, unknown>) => ({
  id: Math.random().toString(36),
  status: "graded",
  counts: true,
  kind: "summative",
  criteria: {},
  raw_score: null,
  max_score: null,
  due_on: "2026-09-01",
  ...over,
})

describe("kindAverages", () => {
  it("normalises MYP levels (/8) and DP scores to percent per kind, ignoring upcoming and uncounted", () => {
    const rows = kindAverages([
      { programme: "MYP", assessments: [a({ kind: "exam", criteria: { A: 8, B: 4 } }), a({ kind: "summative", criteria: { A: 4 } })] },
      { programme: "DP", assessments: [a({ kind: "exam", raw_score: 25, max_score: 100 }), a({ kind: "exam", status: "upcoming", raw_score: 0, max_score: 10 }), a({ kind: "summative", counts: false, raw_score: 0, max_score: 10 })] },
    ] as never)
    expect(rows).toEqual([
      { kind: "exam", average: 50, count: 2 },
      { kind: "summative", average: 50, count: 1 },
    ])
  })
})

describe("gradeDistribution", () => {
  it("counts subjects at each grade 1–7", () => {
    const d = gradeDistribution([{ effectiveGrade: 5 }, { effectiveGrade: 5 }, { effectiveGrade: 7 }, { effectiveGrade: null }] as never)
    expect(d).toEqual([0, 0, 0, 0, 2, 0, 1].map((count, i) => ({ grade: i + 1, count })))
  })
})

describe("criterionAverages", () => {
  it("averages each criterion across MYP subjects' current levels", () => {
    const c = criterionAverages([
      { programme: "MYP", result: { criteria: { A: 6, B: 4, C: null, D: 7 } } },
      { programme: "MYP", result: { criteria: { A: 8, B: null, C: null, D: 5 } } },
      { programme: "DP", result: { criteria: null } },
    ] as never)
    expect(c).toEqual([
      { criterion: "A", average: 7, subjects: 2 },
      { criterion: "B", average: 4, subjects: 1 },
      { criterion: "C", average: null, subjects: 0 },
      { criterion: "D", average: 6, subjects: 2 },
    ])
  })
})

describe("trendMatrix", () => {
  it("carries each subject's latest grade forward across all dates", () => {
    const m = trendMatrix([
      { id: "x", history: [{ date: "2026-09-01", grade: 4 }, { date: "2026-10-01", grade: 6 }] },
      { id: "y", history: [{ date: "2026-09-15", grade: 5 }] },
    ] as never)
    expect(m).toEqual([
      { date: "2026-09-01", x: 4 },
      { date: "2026-09-15", x: 4, y: 5 },
      { date: "2026-10-01", x: 6, y: 5 },
    ])
  })
})
