import { describe, expect, it } from "vitest"
import { buildItems } from "./items"

const subject = {
  id: "s1",
  name: "Physics",
  color: "#2a78d6",
  assessments: [
    { id: "a1", title: "Paper 2", due_on: "2026-11-03", status: "upcoming", kind: "exam", external_uid: "mb-1", source: "managebac" },
    { id: "a2", title: "Lab", due_on: "2026-10-01", status: "graded", kind: "summative", external_uid: null, source: "manual" },
  ],
}

describe("buildItems", () => {
  const events = [
    { id: "e1", title: "Paper 2", all_day: true, starts_on: "2026-11-03", ends_on: null, starts_at: null, ends_at: null, subject_id: "s1", external_uid: "mb-1", source: "managebac", kind: "exam", description: null },
    { id: "e2", title: "Conferences", all_day: true, starts_on: "2026-11-05", ends_on: null, starts_at: null, ends_at: null, subject_id: null, external_uid: "mb-9", source: "managebac", kind: "event", description: null },
    { id: "e3", title: "Study group", all_day: false, starts_on: null, ends_on: null, starts_at: "2026-11-04T10:00:00.000Z", ends_at: "2026-11-04T11:00:00.000Z", subject_id: "s1", external_uid: null, source: "manual", kind: "study", description: null },
  ]

  it("merges assessments and events, dropping ManageBac events already shown as assessments", () => {
    const items = buildItems([subject] as never, events as never)
    expect(items.map((i) => i.key).sort()).toEqual(["a-a1", "a-a2", "e-e2", "e-e3"])
  })

  it("colours by subject and labels the source", () => {
    const items = buildItems([subject] as never, events as never)
    expect(items.find((i) => i.key === "a-a1")).toMatchObject({ color: "#2a78d6", source: "assessment", date: "2026-11-03", allDay: true })
    expect(items.find((i) => i.key === "e-e2")).toMatchObject({ color: null, source: "managebac" })
    expect(items.find((i) => i.key === "e-e3")).toMatchObject({ allDay: false, source: "manual", subjectId: "s1" })
  })
})
