import { describe, expect, it } from "vitest"
import { assessmentInput, subjectInput } from "./schemas"

const base = {
  subjectId: "8a6e0804-2bd0-4672-b79d-d97358d45d65",
  title: "Unit 3 essay",
  kind: "summative" as const,
  status: "graded" as const,
  dueOn: "2026-10-12",
  counts: true,
  weight: 1,
}

describe("assessmentInput", () => {
  it("rejects a score above the maximum", () => {
    const r = assessmentInput.safeParse({ ...base, rawScore: 25, maxScore: 20 })
    expect(r.success).toBe(false)
    expect(r.error?.issues[0].path).toEqual(["rawScore"])
  })

  it("rejects a maximum of 0", () => {
    expect(assessmentInput.safeParse({ ...base, rawScore: 0, maxScore: 0 }).success).toBe(false)
  })

  it("rejects a criterion level of 9", () => {
    expect(assessmentInput.safeParse({ ...base, criteria: { A: 9 } }).success).toBe(false)
  })

  it("accepts criteria with nulls when at least one level is set", () => {
    const r = assessmentInput.safeParse({ ...base, criteria: { A: 6, B: null, C: null, D: 5 } })
    expect(r.success).toBe(true)
  })

  it("requires at least one criterion or a score when graded", () => {
    const r = assessmentInput.safeParse({ ...base, criteria: { A: null } })
    expect(r.success).toBe(false)
    expect(r.error?.issues[0].message).toMatch(/criterion|score/i)
  })

  it("allows an upcoming task with no result", () => {
    expect(assessmentInput.safeParse({ ...base, status: "upcoming" }).success).toBe(true)
  })

  it("requires a maximum when a raw score is given", () => {
    const r = assessmentInput.safeParse({ ...base, rawScore: 12 })
    expect(r.success).toBe(false)
    expect(r.error?.issues[0].path).toEqual(["maxScore"])
  })

  it("rejects an impossible date", () => {
    expect(assessmentInput.safeParse({ ...base, status: "upcoming", dueOn: "2026-02-30" }).success).toBe(false)
  })
})

describe("subjectInput", () => {
  it("requires a 6-digit hex colour", () => {
    expect(subjectInput.safeParse({ name: "Physics", programme: "DP", level: "HL", color: "red" }).success).toBe(false)
  })

  it("accepts a minimal subject", () => {
    expect(subjectInput.safeParse({ name: "Physics", programme: "DP", level: "HL", color: "#4f46e5" }).success).toBe(true)
  })

  it("rejects a target grade outside 1–7", () => {
    expect(
      subjectInput.safeParse({ name: "Physics", programme: "DP", level: "HL", color: "#4f46e5", targetGrade: 8 }).success,
    ).toBe(false)
  })
})
