import { describe, expect, it } from "vitest"
import {
  aggregate,
  computeSubjectGrade,
  DEFAULT_DP_BOUNDARIES,
  gradeHistory,
  MYP_BOUNDARIES,
  mypGradeFromTotal,
  percentToGrade,
  requiredForTarget,
  trendOf,
  type EngineAssessment,
  type SubjectConfig,
} from "./index"

const myp = (aggregation: SubjectConfig["aggregation"] = "average"): SubjectConfig => ({
  programme: "MYP",
  aggregation,
  components: [],
  boundaries: MYP_BOUNDARIES,
})

const dp = (components: SubjectConfig["components"] = []): SubjectConfig => ({
  programme: "DP",
  aggregation: "average",
  components,
  boundaries: DEFAULT_DP_BOUNDARIES,
})

let seq = 0
function task(date: string, criteria: EngineAssessment["criteria"], extra: Partial<EngineAssessment> = {}): EngineAssessment {
  return { id: `t${++seq}`, date, status: "graded", counts: true, criteria, ...extra }
}
function scored(date: string, rawScore: number, maxScore: number, extra: Partial<EngineAssessment> = {}): EngineAssessment {
  return { id: `s${++seq}`, date, status: "graded", counts: true, rawScore, maxScore, ...extra }
}

describe("mypGradeFromTotal", () => {
  it.each([
    [0, 1], [5, 1], [6, 2], [9, 2], [10, 3], [14, 3], [15, 4],
    [18, 4], [19, 5], [23, 5], [24, 6], [27, 6], [28, 7], [32, 7],
  ])("total %i → grade %i", (total, grade) => {
    expect(mypGradeFromTotal(total)).toBe(grade)
  })
})

describe("aggregate", () => {
  it("average rounds half up", () => expect(aggregate([6, 5], "average")).toBe(6))
  it("latest takes the last chronological level", () => expect(aggregate([4, 7], "latest")).toBe(7))
  it("highest", () => expect(aggregate([3, 6, 5], "highest")).toBe(6))
  it("median", () => expect(aggregate([2, 5, 7], "median")).toBe(5))
  it("empty → null", () => expect(aggregate([], "average")).toBeNull())
})

describe("MYP subject grade", () => {
  it("averages each criterion and converts the /32 total", () => {
    const list = [
      task("2026-09-10", { A: 6, B: 5, C: 7, D: 6 }),
      task("2026-10-10", { A: 8, C: 7, D: 5 }),
    ]
    const r = computeSubjectGrade(list, myp())
    expect(r.criteria).toEqual({ A: 7, B: 5, C: 7, D: 6 })
    expect(r.criteriaTotal).toBe(25)
    expect(r.grade).toBe(6)
    expect(r.partial).toBe(false)
    expect(r.criteriaUsed).toBe(4)
    expect(r.basedOn).toBe(2)
  })

  it("latest aggregation uses the most recent level per criterion, regardless of input order", () => {
    const list = [task("2026-10-01", { A: 7 }), task("2026-09-01", { A: 4 })]
    expect(computeSubjectGrade(list, myp("latest")).criteria?.A).toBe(7)
  })

  it("projects partial criteria", () => {
    const r = computeSubjectGrade([task("2026-09-10", { A: 6, C: 8 })], myp())
    expect(r.criteriaTotal).toBe(28)
    expect(r.grade).toBe(7)
    expect(r.partial).toBe(true)
    expect(r.criteriaUsed).toBe(2)
    expect(r.criteria).toEqual({ A: 6, B: null, C: 8, D: null })
  })

  it("ignores upcoming and non-counting assessments", () => {
    const list = [
      task("2026-09-10", { A: 2, B: 2, C: 2, D: 2 }, { status: "upcoming" }),
      task("2026-09-11", { A: 2, B: 2, C: 2, D: 2 }, { counts: false }),
    ]
    const r = computeSubjectGrade(list, myp())
    expect(r.grade).toBeNull()
    expect(r.basedOn).toBe(0)
  })
})

describe("DP subject grade", () => {
  const components = [
    { id: "p1", name: "Paper 1", weight: 60 },
    { id: "ia", name: "Internal Assessment", weight: 40 },
  ]

  it("weights components", () => {
    const list = [scored("2026-09-01", 30, 40, { componentId: "p1" }), scored("2026-10-01", 18, 20, { componentId: "ia" })]
    const r = computeSubjectGrade(list, dp(components))
    expect(r.percentage).toBeCloseTo(81, 5)
    expect(r.grade).toBe(7)
  })

  it("normalises over components that have data", () => {
    const r = computeSubjectGrade([scored("2026-09-01", 30, 40, { componentId: "p1" })], dp(components))
    expect(r.percentage).toBeCloseTo(75, 5)
    expect(r.grade).toBe(6)
  })

  it("dp without components weights by assessment weight, missing weight = 1", () => {
    const list = [scored("2026-09-01", 50, 100, { weight: null }), scored("2026-10-01", 90, 100, { weight: 3 })]
    const r = computeSubjectGrade(list, dp())
    expect(r.percentage).toBeCloseTo(80, 5)
    expect(r.grade).toBe(7)
  })

  it("assessments without a matching component still count (as their own bucket)", () => {
    const list = [scored("2026-09-01", 60, 100, { componentId: null })]
    expect(computeSubjectGrade(list, dp(components)).percentage).toBeCloseTo(60, 5)
  })

  it("percentToGrade uses boundaries", () => {
    expect(percentToGrade(79.9, DEFAULT_DP_BOUNDARIES)).toBe(6)
    expect(percentToGrade(80, DEFAULT_DP_BOUNDARIES)).toBe(7)
    expect(percentToGrade(0, DEFAULT_DP_BOUNDARIES)).toBe(1)
  })
})

describe("history and trend", () => {
  it("gradeHistory has one point per graded assessment in date order", () => {
    const list = [
      task("2026-10-10", { A: 8, B: 8, C: 8, D: 8 }),
      task("2026-09-10", { A: 4, B: 4, C: 4, D: 4 }),
      task("2026-11-10", { A: 1 }, { status: "upcoming" }),
    ]
    const h = gradeHistory(list, myp())
    expect(h.map((p) => p.date)).toEqual(["2026-09-10", "2026-10-10"])
    expect(h.map((p) => p.grade)).toEqual([4, 6])
  })

  it("trendOf", () => {
    expect(trendOf([{ grade: 5 }, { grade: 6 }])).toEqual({ delta: 1, direction: "up" })
    expect(trendOf([{ grade: 6 }, { grade: 4 }])).toEqual({ delta: -2, direction: "down" })
    expect(trendOf([{ grade: 6 }])).toEqual({ delta: 0, direction: "flat" })
  })
})

describe("requiredForTarget", () => {
  it("DP: solves the % needed on the next task", () => {
    const r = requiredForTarget([scored("2026-09-01", 60, 100)], dp(), 6, { weight: 1 })
    expect(r.unit).toBe("percent")
    expect(r.required).toBeCloseTo(80, 5)
    expect(r.achievable).toBe(true)
  })

  it("DP: flags an unreachable target", () => {
    const r = requiredForTarget([scored("2026-09-01", 20, 100)], dp(), 7, { weight: 1 })
    expect(r.required).toBeGreaterThan(100)
    expect(r.achievable).toBe(false)
  })

  it("DP: keeping a grade still needs a minimum score on the next task", () => {
    const r = requiredForTarget([scored("2026-09-01", 95, 100)], dp(), 7, { weight: 1 })
    expect(r.required).toBeCloseTo(65, 5)
    expect(r.achievable).toBe(true)
  })

  it("DP: an easy target needs 0", () => {
    const r = requiredForTarget([scored("2026-09-01", 95, 100)], dp(), 3, { weight: 1 })
    expect(r.required).toBe(0)
    expect(r.achievable).toBe(true)
  })

  it("MYP: minimum uniform level on the next task", () => {
    const r = requiredForTarget([task("2026-09-01", { A: 5, B: 5, C: 5, D: 5 })], myp(), 6, {})
    expect(r.unit).toBe("level")
    expect(r.required).toBe(6)
    expect(r.achievable).toBe(true)
  })

  it("MYP: unreachable when even 8s are not enough", () => {
    const list = [
      task("2026-09-01", { A: 1, B: 1, C: 1, D: 1 }),
      task("2026-09-02", { A: 1, B: 1, C: 1, D: 1 }),
      task("2026-09-03", { A: 1, B: 1, C: 1, D: 1 }),
    ]
    const r = requiredForTarget(list, myp(), 7, {})
    expect(r.achievable).toBe(false)
    expect(r.required).toBeNull()
  })
})
