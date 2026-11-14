import { describe, expect, it } from "vitest"
import { goalProgress } from "./progress"

const ctx = (grades: Record<string, number | null>, totalPoints = 0, gradedSubjects = 0) => ({
  subjects: Object.entries(grades).map(([id, effectiveGrade]) => ({ id, name: id, effectiveGrade })),
  overview: { totalPoints, gradedSubjects },
})

const goal = (over: Partial<Parameters<typeof goalProgress>[0]>) => ({
  metric: "subject_grade" as const,
  subject_id: "phy",
  target_value: 6,
  current_value: null,
  achieved_at: null,
  ...over,
})

describe("goalProgress", () => {
  it("subject goal met", () => {
    expect(goalProgress(goal({}), ctx({ phy: 6 }))).toEqual({ current: 6, target: 6, ratio: 1, status: "achieved" })
  })
  it("subject goal one below is on track", () => {
    expect(goalProgress(goal({}), ctx({ phy: 5 })).status).toBe("on-track")
  })
  it("subject goal far below is at risk", () => {
    expect(goalProgress(goal({}), ctx({ phy: 3 })).status).toBe("at-risk")
  })
  it("no grade yet → no-data", () => {
    expect(goalProgress(goal({}), ctx({ phy: null }))).toMatchObject({ current: null, ratio: 0, status: "no-data" })
  })
  it("deleted subject → no-data", () => {
    expect(goalProgress(goal({ subject_id: "gone" }), ctx({ phy: 7 })).status).toBe("no-data")
  })
  it("total points goal uses the overview", () => {
    const r = goalProgress(goal({ metric: "total_points", subject_id: null, target_value: 36 }), ctx({}, 30, 6))
    expect(r.ratio).toBeCloseTo(0.833, 3)
    expect(r.status).toBe("at-risk")
  })
  it("custom goal uses its manual value", () => {
    expect(goalProgress(goal({ metric: "custom", subject_id: null, target_value: 10, current_value: 9 }), ctx({})).status).toBe("on-track")
  })
})
