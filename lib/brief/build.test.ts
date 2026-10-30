import { describe, expect, it } from "vitest"
import { buildBrief, type BriefInput } from "./build"

const base = (over: Partial<BriefInput> = {}): BriefInput => ({
  today: "2026-10-30",
  days: 3,
  timezone: "Asia/Kolkata",
  subjects: [
    { id: "ma", name: "Mathematics", color: "#e87ba4", grade: 5, target: 7, assessments: [{ id: "a1", title: "Geometry test", due_on: "2026-11-01", status: "upcoming", kind: "exam" }] },
    { id: "sc", name: "Sciences", color: "#eda100", grade: 6, target: 7, assessments: [{ id: "a2", title: "Ecology investigation", due_on: "2026-10-31", status: "upcoming", kind: "summative" }] },
    { id: "fr", name: "French", color: "#eb6834", grade: 6, target: 6, assessments: [{ id: "a3", title: "Oral", due_on: "2026-11-20", status: "upcoming", kind: "summative" }] },
  ],
  events: [{ id: "e1", title: "Parent conferences", all_day: true, starts_on: "2026-10-30", starts_at: null }],
  todos: [
    { id: "t1", title: "Print lab sheet", due_on: "2026-10-29", subject_id: "sc" },
    { id: "t2", title: "Revise trig", due_on: "2026-10-31", subject_id: "ma" },
    { id: "t3", title: "Someday", due_on: null, subject_id: null },
  ],
  reminders: [{ id: "r1", title: "Bring calculator", remind_at: "2026-10-31T20:00:00Z" }],
  study: { todayMinutes: 20, goalMinutes: 60, streak: 4, atRisk: true },
  ...over,
})

describe("buildBrief", () => {
  it("groups the next N days with friendly labels", () => {
    const b = buildBrief(base())
    expect(b.days.map((d) => d.label)).toEqual(["Today", "Tomorrow", "Sun 1 Nov"])
  })

  it("places items on the right day, including reminders in the student's time zone", () => {
    const b = buildBrief(base())
    const titles = (i: number) => b.days[i].items.map((x) => x.title)
    expect(titles(0)).toEqual(["Parent conferences"])
    expect(titles(1)).toEqual(["Ecology investigation", "Revise trig"])
    // 20:00 UTC on 31 Oct is 01:30 on 1 Nov in India
    expect(titles(2)).toEqual(["Geometry test", "Bring calculator"])
  })

  it("leaves out assessments beyond the window and undated to-dos", () => {
    const all = buildBrief(base()).days.flatMap((d) => d.items.map((x) => x.title))
    expect(all).not.toContain("Oral")
    expect(all).not.toContain("Someday")
  })

  it("reports overdue to-dos separately", () => {
    expect(buildBrief(base()).overdue.map((t) => t.title)).toEqual(["Print lab sheet"])
  })

  it("focuses on the subject furthest below target with an assessment coming up", () => {
    expect(buildBrief(base()).focus).toMatchObject({ subjectName: "Mathematics", gap: 2, assessmentTitle: "Geometry test" })
  })

  it("explains the days ahead in plain sentences", () => {
    const text = buildBrief(base()).summary.join(" ")
    expect(text).toMatch(/2 assessments in the next 3 days/)
    expect(text).toMatch(/Mathematics/)
    expect(text).toMatch(/1 overdue/)
    expect(text).toMatch(/streak/)
  })

  it("has a calm message when nothing is due", () => {
    const b = buildBrief(base({ subjects: [], events: [], todos: [], reminders: [], study: { todayMinutes: 60, goalMinutes: 60, streak: 0, atRisk: false } }))
    expect(b.summary[0]).toMatch(/Nothing is due/)
    expect(b.focus).toBeNull()
  })
})
