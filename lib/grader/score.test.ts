import { describe, expect, it } from "vitest"
import { SUBJECT_GROUPS } from "@/lib/ib"
import { builtInRubric, gradeRequest, isLanguageGroup, TASK_TYPES, taskExample, taskTypesFor, type TaskType } from "./rubrics"
import { artsEvaluation, narrativeStrong } from "./fixtures"
import { gradeTask, parseRubric } from "./score"
import { STRANDS } from "./strands"

const req = (o: Record<string, string>) =>
  gradeRequest.parse({ programme: "MYP", subjectName: "English", subjectGroup: "Language and literature", year: "3", taskType: "Essay", ...o })

const strong = `In "The Sea", the poet uses imagery of crashing waves to suggest the speaker's loneliness. This suggests that isolation is overwhelming, because the reader feels the force of the water.

Furthermore, the tone shifts in the second stanza. For example, the phrase "silent shore" implies calm acceptance. This shows how the theme of grief develops, and the symbol of the tide represents the passing of time.

However, an alternative interpretation is that the sea is a source of comfort. In my view, the poet's purpose is to show that the same image can carry different connotations depending on the character's context.

Moreover, the structure reinforces this effect. The short final line creates a pause, which means the reader lingers on the speaker's sense of loss. As a result, the technique deepens our understanding.

In conclusion, the poet's careful use of imagery, tone and symbolism helps the reader understand that grief is both overwhelming and, over time, something that can be accepted.`
const weak = "the poem is about the sea. it is sad. the sea is big. i liked it. the end of the poem is good."

describe("gradeTask", () => {
  it("grades a developed essay above a weak one", () => {
    const a = gradeTask(req({}), strong)
    const b = gradeTask(req({}), weak)
    expect(a.criteria.map((c) => c.name)).toEqual(["Analysing", "Organizing", "Producing text", "Using language"])
    expect(a.overall_grade).toBeGreaterThan(b.overall_grade)
    const words: Record<string, string> = { "1–2": "limited", "3–4": "adequate", "5–6": "substantial", "7–8": "excellent" }
    for (const c of a.criteria) {
      expect(c.score).toBeLessThanOrEqual(c.max)
      expect(c.justification).toContain(words[c.band])
    }
    expect(a.criteria[0].strengths.join(" ")).not.toMatch(/\bimpl\b/)
    expect(b.next_steps.length).toBeGreaterThan(0)
  })

  it("refuses to grade almost nothing", () => {
    const r = gradeTask(req({}), "too short")
    expect(r.criteria.every((c) => c.score === 0)).toBe(true)
    expect(r.summary).toMatch(/isn't enough text/)
  })

  it("uses DP component rubrics", () => {
    const r = gradeTask(req({ programme: "DP", taskType: "Extended essay", subjectGroup: "Sciences" }), strong)
    expect(r.criteria.map((c) => c.max)).toEqual([6, 6, 12, 4, 6])
    expect(r.overall_grade).toBeGreaterThanOrEqual(1)
  })

  it("grades against a student-supplied rubric", () => {
    const r = gradeTask(req({ rubric: "Criterion A: Use of imagery (0-6)\nexplains imagery and its effect on the reader\nCriterion B: Conclusion (out of 4)" }), strong)
    expect(r.criteria.map((c) => [c.id, c.name, c.max])).toEqual([["A", "Use of imagery", 6], ["B", "Conclusion", 4]])
    expect(r.summary).toContain("your rubric")
  })

  it("falls back to the IB rubric when the pasted text has no criteria", () => {
    const r = gradeTask(req({ rubric: "Write an essay analysing imagery in the poem." }), strong)
    expect(r.criteria).toHaveLength(4)
    expect(r.caveats).toMatch(/built-in IB criteria/)
  })

  it("grades only the criteria the student ticked", () => {
    const r = gradeTask(req({ criteria: "A,C" }), strong)
    expect(r.criteria.map((c) => c.id)).toEqual(["A", "C"])
    expect(r.caveats).toMatch(/Graded on criteria A, C only/)
    // Next steps come only from the ticked criteria.
    const onlyB = gradeTask(req({ criteria: "B" }), weak).next_steps.join(" ")
    expect(onlyB).toMatch(/paragraphs with an introduction/)
    expect(onlyB).not.toMatch(/Address more of what this criterion/)
    expect(gradeTask(req({ criteria: "A,C" }), weak).next_steps.join(" ")).not.toMatch(/paragraphs with an introduction/)
    const none = gradeTask(req({ criteria: "Z" }), strong)
    expect(none.criteria).toHaveLength(4)
    expect(none.caveats).toMatch(/None of the criteria you ticked/)
  })

  it("checks the work answers the task that was set", () => {
    const onTask = gradeTask(req({ task: "Analyse how the poet uses imagery and symbolism to present grief." }), strong)
    const offTask = gradeTask(req({ task: "Evaluate the economic consequences of globalisation for developing countries." }), strong)
    expect(onTask.summary).toMatch(/Task fit: \d+ of \d+ key terms/)
    expect(onTask.next_steps.join(" ")).not.toMatch(/Answer the task/)
    expect(offTask.next_steps[0]).toMatch(/^Answer the task directly: it asks about economic/)
    expect(onTask.criteria[0].score).toBeGreaterThan(offTask.criteria[0].score)
  })
})

describe("builtInRubric", () => {
  it("gives every programme, group and task type a complete criteria set, never silently falling back", () => {
    for (const programme of ["MYP", "DP"] as const) {
      for (const group of SUBJECT_GROUPS[programme]) {
        for (const task of TASK_TYPES) {
          const r = builtInRubric(programme, group, task, "Some subject")
          expect(r.criteria.length, `${programme} ${group} ${task}`).toBeGreaterThan(0)
          expect(new Set(r.criteria.map((c) => c.id)).size).toBe(r.criteria.length)
          expect(r.criteria.every((c) => c.max > 0 && c.name)).toBe(true)
          expect(r.notes.some((n) => n.includes("isn't set"))).toBe(false)
          if (programme === "MYP") expect(r.label).toBe(`MYP ${group} criteria`)
          // Only Language A work should get Language A criteria.
          if (!/language and literature|TOK|Extended/i.test(`${group} ${r.label}`)) expect(r.label).not.toMatch(/Language A/)
        }
      }
    }
  })

  it("has strands for every content criterion, so a changed rubric can't silently fall back to keywords", () => {
    for (const programme of ["MYP", "DP"] as const) {
      for (const group of SUBJECT_GROUPS[programme]) {
        for (const task of TASK_TYPES) {
          const subject = group === "Individuals and societies" ? ["History", "Economics", "Geography", "Psychology"] : ["Some subject"]
          for (const name of subject) {
            const r = builtInRubric(programme, group, task, name)
            for (const c of r.criteria.filter((c) => c.kind === "content")) expect(STRANDS[r.label]?.[c.id]?.length, `${r.label} ${c.id}`).toBeGreaterThan(0)
          }
        }
      }
    }
  })

  it("works out the group from the subject name when it isn't set", () => {
    const art = builtInRubric("MYP", undefined, "Project / portfolio", "Visual Art")
    expect(art.criteria.map((c) => c.name)).toEqual(["Investigating", "Developing", "Creating/performing", "Evaluating"])
    expect(art.notes[0]).toMatch(/Arts was worked out from the subject name/)
    const cases: [ "MYP" | "DP", string, TaskType, string][] = [
      ["DP", "Visual Arts", "Essay", "DP arts assessment objectives"],
      ["DP", "Biology HL", "Lab report", "DP Sciences IA criteria"],
      ["DP", "Economics SL", "Internal assessment (IA)", "DP Economics IA criteria (one commentary)"],
      ["DP", "History", "Internal assessment (IA)", "DP History IA criteria"],
      ["DP", "French B", "Essay", "DP Language B writing criteria"],
      ["DP", "English A: Language and Literature", "Internal assessment (IA)", "DP Language A individual oral criteria"],
      ["DP", "Theory of Knowledge", "Other", "DP TOK essay criteria"],
      ["MYP", "Spanish", "Essay", "MYP Language acquisition criteria"],
      ["MYP", "Physical Education", "Essay", "MYP Physical and health education criteria"],
      ["MYP", "Digital Design", "Project / portfolio", "MYP Design criteria"],
      ["MYP", "Integrated Sciences", "Lab report", "MYP Sciences criteria"],
    ]
    for (const [programme, name, task, label] of cases) expect(builtInRubric(programme, undefined, task, name).label, name).toBe(label)
  })

  it("keeps a group that was set, and says so when it can't tell", () => {
    expect(builtInRubric("MYP", "Arts", "Essay", "English").label).toBe("MYP Arts criteria")
    const unknown = builtInRubric("MYP", undefined, "Essay", "Advisory")
    expect(unknown.label).toBe("MYP Language and literature criteria")
    expect(unknown.notes[0]).toMatch(/couldn't be worked out/)
  })

  it("grades a Visual Art subject with no group against the Arts criteria", () => {
    const r = gradeTask(req({ subjectName: "Visual Art", subjectGroup: "" }), strong)
    expect(r.criteria.map((c) => c.name)).toEqual(["Investigating", "Developing", "Creating/performing", "Evaluating"])
    expect(r.summary).toContain("MYP Arts criteria")
    expect(r.caveats).toMatch(/worked out from the subject name/)
  })
})

describe("subject-aware form", () => {
  it("offers only task types that exist for the programme and subject", () => {
    expect(taskTypesFor("MYP", "Sciences")).toContain("Lab report")
    expect(taskTypesFor("MYP", "Language and literature")).not.toContain("Lab report")
    for (const t of ["Internal assessment (IA)", "Extended essay", "TOK essay"] as const) expect(taskTypesFor("MYP", "Sciences")).not.toContain(t)
    expect(taskTypesFor("DP", "Sciences")).toEqual(expect.arrayContaining(["Lab report", "Internal assessment (IA)", "Extended essay"]))
    expect(taskTypesFor("DP", "Core (TOK / EE)")).toEqual(["Extended essay", "TOK essay", "Other"])
    expect(taskTypesFor("MYP", "Personal project")).toEqual(["Project / portfolio", "Other"])
    for (const programme of ["MYP", "DP"] as const) for (const g of SUBJECT_GROUPS[programme]) expect(taskTypesFor(programme, g).length).toBeGreaterThan(0)
  })

  it("asks for the type of writing in language subjects only", () => {
    expect(isLanguageGroup("Language and literature")).toBe(true)
    expect(isLanguageGroup("Studies in language and literature")).toBe(true)
    expect(isLanguageGroup("Language acquisition")).toBe(true)
    expect(isLanguageGroup("Sciences")).toBe(false)
    expect(taskExample("Sciences")).toMatch(/rate of reaction/)
  })

  it("marks physics on the physics criteria, never as a type of writing", () => {
    const story = "The photon raced through the vacuum. Suddenly it hit the glass and slowed down, bending towards the normal. It felt the cold, dense medium. Moments later it escaped into the air and sped up again, bending away from the normal."
    const r = gradeTask(req({ subjectName: "Physics", subjectGroup: "Sciences", year: "5", taskType: "Summative assessment", mode: "narrative", task: "Write a story about a photon travelling through glass." }), story)
    expect(r.criteria.map((c) => c.name)).toEqual(["Knowing and understanding", "Inquiring and designing", "Processing and evaluating", "Reflecting on the impacts of science"])
    expect(r.mode).toBe("analytical")
    expect(r.summary).not.toMatch(/Marked as/)
    expect([...r.next_steps, ...r.criteria.flatMap((c) => c.improvements)].join(" ")).not.toMatch(/show, don't tell|Shape the story|sensory/i)
  })

  it("gives marks, not a 1–7 grade, when only some criteria are ticked", () => {
    const some = gradeTask(req({ criteria: "A,C" }), strong)
    expect(some.partial).toBe(true)
    expect(some.caveats).toMatch(/a mark out of 16, not a 1–7 grade/)
    expect(gradeTask(req({}), strong).partial).toBe(false)
  })

  it("doesn't give marks for criteria the work can't show", () => {
    // A story has no analysis in it, however good the storytelling.
    const story = gradeTask(req({ taskType: "Summative assessment", criteria: "A,C", task: "Write a story about courage." }), narrativeStrong)
    expect(story.criteria[0].score).toBeLessThanOrEqual(3)
    expect(story.criteria[1].score).toBeGreaterThan(story.criteria[0].score)
    // Creating is judged from the artwork itself, so writing about it earns a low mark at most.
    const arts = gradeTask(req({ subjectName: "Visual Art", subjectGroup: "Arts", year: "5", taskType: "Summative assessment", criteria: "C" }), artsEvaluation)
    expect(arts.criteria[0].score).toBeLessThanOrEqual(3)
    expect(arts.caveats).toMatch(/Creating\/performing: assessed from the recording, performance or artwork itself/)
  })

  it("expects science and maths answers to be about half as long, but not lab reports", () => {
    const answer = "Light slows down in glass because glass is optically denser than air, so its speed drops from 3.0 × 10^8 m/s to about 2.0 × 10^8 m/s. This change in speed makes the ray bend towards the normal as it enters. ".repeat(3)
    const physics = (taskType: string, text = answer) => gradeTask(req({ subjectName: "Physics", subjectGroup: "Sciences", year: "5", taskType }), text)
    const history = gradeTask(req({ subjectName: "History", subjectGroup: "Individuals and societies", year: "5", taskType: "Summative assessment" }), answer)
    const aim = (r: ReturnType<typeof gradeTask>) => r.criteria.flatMap((c) => c.improvements).join(" ").match(/aim for roughly (\d+)/)?.[1]
    expect(aim(physics("Summative assessment"))).toBe("275")
    expect(aim(history)).toBe("550")
    expect(aim(gradeTask(req({ subjectName: "Mathematics", subjectGroup: "Mathematics", year: "5", taskType: "Summative assessment" }), answer))).toBe("275")
    expect(aim(gradeTask(req({ programme: "DP", subjectName: "Maths AA", subjectGroup: "Mathematics", year: "1", taskType: "Internal assessment (IA)" }), answer))).toBe("2200")
    expect(aim(physics("Lab report"))).toBe("770")
  })

  it("marks an arts evaluation on appraising the work and reflecting on growth, not on essay features", () => {
    // Two dense blocks with no headings, quotations or citations: a teacher would give about 7/8.
    const r = gradeTask(req({ subjectName: "Visual Art", subjectGroup: "Arts", year: "5", taskType: "Summative assessment", criteria: "D" }), artsEvaluation)
    const d = r.criteria[0]
    expect(d.name).toBe("Evaluating")
    expect(d.score).toBeGreaterThanOrEqual(6)
    expect(d.justification).toMatch(/2 of its 2 strands/)
    expect(d.strengths.join(" ")).toMatch(/appraise your own artwork/)
    // A bare description of the same artwork shows neither strand.
    const thin = gradeTask(req({ subjectName: "Visual Art", subjectGroup: "Arts", year: "5", taskType: "Summative assessment", criteria: "D" }), "My artwork shows a tree and a lamp and a road at my school. I used blue and green and yellow. I drew the tree first and then the lamp. I think it looks nice and I like it. It took me three lessons to finish it.")
    expect(thin.criteria[0].score).toBeLessThanOrEqual(2)
    expect(thin.criteria[0].improvements.join(" ")).toMatch(/Judge your work against your intention/)
  })
})

describe("parseRubric", () => {
  it("reads maxima in several notations and defaults the rest", () => {
    const r = parseRubric("A. Knowing (max 8)\nCriterion B – Investigating /6\nC) Communicating", 8)
    expect(r.map((c) => [c.id, c.name, c.max, c.kind])).toEqual([
      ["A", "Knowing", 8, "content"],
      ["B", "Investigating", 6, "content"],
      ["C", "Communicating", 8, "organisation"],
    ])
  })
})
