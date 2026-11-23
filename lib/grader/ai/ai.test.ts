import { describe, expect, it } from "vitest"
import { gradeRequest } from "../rubrics"
import { narrativeStrong, narrativeWeak } from "../fixtures"
import { gradeTask } from "../score"
import { chunkText, cosine, coverageFromMatch } from "./meaning"
import { buildFeedbackMessages, feedbackTokens } from "./prompt"

const req = (o: Record<string, string>) =>
  gradeRequest.parse({ programme: "MYP", subjectName: "English", subjectGroup: "Language and literature", year: "3", taskType: "Practice worksheet", ...o })

describe("meaning helpers", () => {
  it("measures similarity of normalised vectors", () => {
    expect(cosine([1, 0], [1, 0])).toBe(1)
    expect(cosine([1, 0], [0, 1])).toBe(0)
  })

  it("splits work into paragraph-sized pieces", () => {
    const long = Array.from({ length: 300 }, (_, i) => `word${i}`).join(" ")
    const chunks = chunkText(`${long}\n\nshort\n\nThis paragraph has more than eight words in it, so it stays.`)
    expect(chunks.map((c) => c.split(" ").length)).toEqual([120, 120, 60, 12])
    expect(chunkText("too short")).toEqual(["too short"])
  })

  it("maps similarity to task coverage using the calibrated range", () => {
    expect(coverageFromMatch(0.1)).toBe(0) // unrelated work measured up to 0.30
    expect(coverageFromMatch(0.25)).toBeCloseTo(0.5)
    expect(coverageFromMatch(0.36)).toBe(1) // own-task matches measured 0.32-0.74
  })
})

describe("grading with the meaning match", () => {
  const task = "Write a narrative about a moment of unexpected courage."

  it("lets a story that fits the task in meaning pass, without naming the theme", () => {
    const r = gradeTask(req({ task, taskMatch: "0.32", criteria: "C,D" }), narrativeStrong.replace("quiet courage", "quiet kindness"))
    expect(r.next_steps.join(" ")).not.toMatch(/Answer the task directly/)
    expect(r.summary).toMatch(/Task fit: strong match in meaning/)
  })

  it("flags a story that doesn't respond to the task", () => {
    const onTask = gradeTask(req({ task, taskMatch: "0.32", criteria: "C,D" }), narrativeStrong)
    const offTask = gradeTask(req({ task, taskMatch: "0.05", criteria: "C,D" }), narrativeStrong)
    expect(offTask.next_steps[0]).toMatch(/Answer the task directly: your work doesn't seem to respond to "Write a narrative/)
    expect(offTask.summary).toMatch(/weak match/)
    expect(offTask.criteria[0].score).toBeLessThan(onTask.criteria[0].score)
  })

  it("counts synonyms: the meaning match overrides missing task words", () => {
    const essay = `In "The Sea", the poet uses imagery of crashing waves to suggest the speaker's loneliness. This suggests that isolation is overwhelming, because the reader feels the force of the water. Furthermore, the phrase "silent shore" implies calm acceptance of grief, and the tide represents the passing of time.`
    const sorrowTask = "Analyse how the poet presents sorrow and mourning."
    const literalOnly = gradeTask(req({ task: sorrowTask, taskType: "Essay" }), essay)
    const withMeaning = gradeTask(req({ task: sorrowTask, taskType: "Essay", taskMatch: "0.6" }), essay)
    expect(literalOnly.next_steps.join(" ")).toMatch(/Answer the task directly/)
    expect(withMeaning.next_steps.join(" ")).not.toMatch(/Answer the task directly/)
  })

  it("ignores a match when no task was given, and reports the type of writing", () => {
    const r = gradeTask(req({ taskMatch: "0.05", criteria: "C,D" }), narrativeWeak)
    expect(r.summary).not.toMatch(/Task fit/)
    expect(r.mode).toBe("narrative")
  })
})

describe("on-device feedback prompt", () => {
  const input = {
    programme: "MYP" as const,
    year: 3,
    subjectName: "English",
    taskType: "Practice worksheet",
    mode: "narrative" as const,
    task: "Write a narrative about courage.",
    criteria: [
      { id: "C", name: "Producing text", score: 8, max: 8 },
      { id: "D", name: "Using language", score: 7, max: 8 },
    ],
    text: narrativeStrong,
  }

  it("gives the model the task, criteria, scores and work, in a fixed layout", () => {
    const [system, user] = buildFeedbackMessages(input)
    expect(system.role).toBe("system")
    expect(system.content).toMatch(/Do not change or invent marks/)
    expect(user.content).toContain("This is a narrative or descriptive piece.")
    expect(user.content).toContain("The task was: Write a narrative about courage.")
    expect(user.content).toContain("Criterion C (Producing text): estimated 8/8")
    expect(user.content).toContain("Criterion D (Using language)\nStrength: …\nImprove: …")
    expect(user.content).toContain("The bell had already rung")
  })

  it("cuts very long work and sizes the answer to the criteria", () => {
    const long = { ...input, text: Array.from({ length: 1200 }, () => "word").join(" ") }
    const work = buildFeedbackMessages(long)[1].content.split('"""')[1]
    expect(work.trim().split(/\s+/).length).toBe(901) // 900 words + the "[…]" marker
    expect(feedbackTokens(2)).toBe(290)
    expect(feedbackTokens(10)).toBe(600)
  })
})
