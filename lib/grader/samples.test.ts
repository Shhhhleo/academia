import { describe, expect, it } from "vitest"
import { gradeRequest } from "./rubrics"
import { detectMode, gradeTask } from "./score"
import { analytical, descriptive, informative, narrativeStrong, narrativeWeak, persuasiveStrong, persuasiveWeak } from "./fixtures"

const req = (o: Record<string, string>) =>
  gradeRequest.parse({ programme: "MYP", subjectName: "English", subjectGroup: "Language and literature", year: "3", taskType: "Practice worksheet", ...o })
const advice = (r: ReturnType<typeof gradeTask>) => [...r.next_steps, ...r.criteria.flatMap((c) => c.improvements)].join(" ")
const ANALYSIS_ADVICE = /this shows|Address more of what this criterion|i believe|Support each point with a quote/i

describe("detectMode", () => {
  it("reads the type of writing from the task", () => {
    expect(detectMode("Write a short story about a moment that changed you.", "Practice worksheet", "").mode).toBe("narrative")
    expect(detectMode("Describe a busy market using sensory details.", "Formative assessment", "").mode).toBe("narrative")
    expect(detectMode("Write a speech persuading your school to ban single-use plastic.", "Essay", "").mode).toBe("persuasive")
    expect(detectMode("Analyse how the poet presents grief in 'The Sea'.", "Essay", "").mode).toBe("analytical")
    expect(detectMode("Analyse how the writer builds tension in the short story.", "Essay", "").mode).toBe("analytical")
    expect(detectMode("Write a magazine article explaining how volcanoes form.", "Essay", "").mode).toBe("informative")
  })

  it("works it out from the writing when there is no task", () => {
    expect(detectMode(undefined, "Practice worksheet", narrativeStrong)).toEqual({ mode: "narrative", from: "work" })
    expect(detectMode(undefined, "Practice worksheet", descriptive).mode).toBe("narrative")
    expect(detectMode(undefined, "Essay", persuasiveStrong).mode).toBe("persuasive")
    expect(detectMode(undefined, "Essay", analytical).mode).toBe("analytical")
    expect(detectMode(undefined, "Lab report", "The results show the rate increased.").mode).toBe("informative")
  })
})

describe("grading by type of writing", () => {
  it("does not give analysis advice for narrative writing on criteria C and D", () => {
    const r = gradeTask(req({ criteria: "C,D", task: "Write a narrative about a moment of unexpected courage." }), narrativeStrong)
    expect(r.criteria.map((c) => c.id)).toEqual(["C", "D"])
    expect(advice(r)).not.toMatch(ANALYSIS_ADVICE)
    expect(r.summary).toMatch(/narrative/i)
    expect(r.criteria[0].score).toBeGreaterThanOrEqual(5)
  })

  it("marks a vivid story above a flat one, and tells the flat one how to improve as a story", () => {
    const strong = gradeTask(req({ criteria: "C,D" }), narrativeStrong)
    const weak = gradeTask(req({ criteria: "C,D" }), narrativeWeak)
    expect(strong.overall_grade).toBeGreaterThan(weak.overall_grade)
    expect(strong.criteria[0].score).toBeGreaterThan(weak.criteria[0].score)
    expect(advice(weak)).toMatch(/show, don't tell|sensory/i)
    expect(advice(weak)).toMatch(/went|nice|very/)
    expect(advice(weak)).not.toMatch(ANALYSIS_ADVICE)
  })

  it("doesn't ask a story to name its theme", () => {
    const shown = narrativeStrong.replace("quiet courage", "quiet kindness")
    const r = gradeTask(req({ criteria: "C,D", task: "Write a narrative about a moment of unexpected courage." }), shown)
    expect(advice(r)).not.toMatch(/Answer the task directly/)
    expect(r.summary).not.toMatch(/Task fit/)
  })

  it("rewards description without dialogue", () => {
    const d = gradeTask(req({ criteria: "C,D", task: "Describe a busy market using sensory details." }), descriptive)
    const weak = gradeTask(req({ criteria: "C,D" }), narrativeWeak)
    expect(d.criteria[0].score).toBeGreaterThanOrEqual(weak.criteria[0].score + 2)
    expect(advice(d)).not.toMatch(ANALYSIS_ADVICE)
    // A description needs no dialogue or plot, and "sensory details" is how to write, not what about.
    expect(advice(d)).not.toMatch(/dialogue|turning point|Answer the task directly/i)
  })

  it("marks persuasive writing on argument, evidence and persuasive technique", () => {
    const task = "Write a speech persuading your school to ban single-use plastic."
    const strong = gradeTask(req({ task, taskType: "Essay" }), persuasiveStrong)
    const weak = gradeTask(req({ task, taskType: "Essay" }), persuasiveWeak)
    expect(strong.overall_grade).toBeGreaterThan(weak.overall_grade)
    expect(advice(weak)).toMatch(/counter-argument|rhetorical question/i)
    expect(advice(weak)).toMatch(/fact, statistic or real example/i)
    expect(advice(strong)).not.toMatch(/show, don't tell/i)
    // It opens with a position and ends on a call to action, so it isn't told to.
    expect(advice(strong)).not.toMatch(/Open with a clear position/i)
    expect(strong.criteria.find((c) => c.id === "B")!.score).toBeGreaterThan(weak.criteria.find((c) => c.id === "B")!.score)
  })

  it("still marks literary analysis as analysis", () => {
    const r = gradeTask(req({ task: "Analyse how the poet presents grief.", taskType: "Essay" }), analytical)
    expect(r.summary).toMatch(/analytical/i)
    expect(advice(r)).not.toMatch(/show, don't tell|Shape the story/i)
  })

  it("never gives story advice to informative or science writing", () => {
    const article = gradeTask(req({ task: "Write a magazine article explaining how volcanoes form.", taskType: "Essay" }), informative)
    const lab = gradeTask(req({ subjectName: "Sciences", subjectGroup: "Sciences", taskType: "Lab report" }), informative)
    for (const r of [article, lab]) expect(advice(r)).not.toMatch(/show, don't tell|Shape the story|sensory/i)
  })

  it("lets the student choose the type of writing", () => {
    const r = gradeTask(req({ mode: "narrative", criteria: "C,D" }), narrativeWeak)
    expect(r.summary).toMatch(/narrative/i)
    expect(r.caveats).not.toMatch(/worked out from your writing/)
  })

  it("keeps every score within its maximum", () => {
    for (const text of [narrativeStrong, narrativeWeak, descriptive, persuasiveStrong, persuasiveWeak, analytical, informative]) {
      for (const c of gradeTask(req({}), text).criteria) expect(c.score).toBeLessThanOrEqual(c.max)
    }
  })
})
