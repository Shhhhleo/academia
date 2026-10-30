import { describe, expect, it } from "vitest"
import { averageTimeline, upcomingItems } from "./insights"

const subj = (id: string, history: { date: string; grade: number }[]) => ({
  id,
  name: id,
  color: "#000000",
  history: history.map((h, i) => ({ ...h, percentage: null, assessmentId: `${id}-${i}` })),
  assessments: [],
})

describe("averageTimeline", () => {
  it("averages each subject's latest grade as of every date", () => {
    const t = averageTimeline([
      subj("math", [
        { date: "2026-09-01", grade: 4 },
        { date: "2026-10-01", grade: 6 },
      ]),
      subj("sci", [{ date: "2026-09-15", grade: 6 }]),
    ])
    expect(t).toEqual([
      { date: "2026-09-01", average: 4, subjects: 1 },
      { date: "2026-09-15", average: 5, subjects: 2 },
      { date: "2026-10-01", average: 6, subjects: 2 },
    ])
  })

  it("merges same-day changes into one point", () => {
    const t = averageTimeline([subj("a", [{ date: "2026-09-01", grade: 5 }]), subj("b", [{ date: "2026-09-01", grade: 7 }])])
    expect(t).toEqual([{ date: "2026-09-01", average: 6, subjects: 2 }])
  })

  it("is empty with no history", () => {
    expect(averageTimeline([subj("a", [])])).toEqual([])
  })
})

describe("upcomingItems", () => {
  it("lists upcoming assessments and events from today, soonest first, de-duplicated by ManageBac uid", () => {
    const items = upcomingItems(
      [
        {
          id: "s1",
          name: "Physics",
          color: "#111111",
          history: [],
          assessments: [
            { id: "a1", title: "Paper 2", due_on: "2026-11-03", status: "upcoming", external_uid: "mb-1" },
            { id: "a2", title: "Old", due_on: "2026-10-01", status: "upcoming", external_uid: null },
            { id: "a3", title: "Done", due_on: "2026-11-02", status: "graded", external_uid: null },
          ],
        },
      ],
      [
        { id: "e1", title: "Paper 2", starts_on: "2026-11-03", starts_at: null, all_day: true, subject_id: "s1", external_uid: "mb-1", kind: "deadline" },
        { id: "e2", title: "Parents evening", starts_on: "2026-11-01", starts_at: null, all_day: true, subject_id: null, external_uid: null, kind: "event" },
      ],
      "2026-10-30",
    )
    expect(items.map((i) => i.title)).toEqual(["Parents evening", "Paper 2"])
    expect(items[1]).toMatchObject({ kind: "assessment", subjectName: "Physics", date: "2026-11-03" })
  })
})
