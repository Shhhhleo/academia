import { describe, expect, it } from "vitest"
import { gradeRequest } from "../rubrics"
import { narrativeStrong, narrativeWeak } from "../fixtures"
import { gradeTask } from "../score"
import { chunkText, cosine, coverageFromMatch } from "./meaning"
import { buildMarkMessages, MARK_PREFILL, parseMark, workForMarking } from "./prompt"

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

describe("on-device marking prompt", () => {
  const input = {
    programme: "MYP" as const,
    year: 5,
    subjectName: "Visual Arts",
    taskType: "Summative assessment",
    task: "Investigate an art movement.",
    criteria: [{ id: "A", name: "Investigating", max: 8, asks: ["investigate a movement or genre", "critique an artwork or performance from it"] }],
    text: "Impressionism began in Paris in the 1860s.\n\nMonet painted light.",
  }

  it("gives the model one criterion, its strands, the levels and the work, and asks for the mark first", () => {
    const [system, user] = buildMarkMessages(input, input.criteria[0])
    expect(system.content).toMatch(/IB Visual Arts teacher marking an MYP Year 5 student's work/)
    expect(system.content).toMatch(/Be strict/)
    expect(user.content).toContain("Criterion A: Investigating (0 to 8). The student should:\ni. investigate a movement or genre\nii. critique an artwork or performance from it\n")
    expect(user.content).toContain("The task was: Investigate an art movement.")
    expect(user.content).toContain("7-8 excellent:")
    expect(user.content).toContain('"""\nImpressionism began in Paris in the 1860s.\n\nMonet painted light.\n"""')
    expect(user.content).toMatch(/layout:\nMark: a whole number from 0 to 8\nWhy: /)
    expect(MARK_PREFILL.endsWith("Mark: ")).toBe(true)
  })

  it("names the criterion alone when it has no strands, for a Diploma student", () => {
    const [system, user] = buildMarkMessages({ ...input, programme: "DP", task: "" }, { id: "B", name: "Organisation", max: 5, asks: [] })
    expect(system.content).toMatch(/marking a Diploma Programme student's work/)
    expect(user.content).toContain("Criterion B: Organisation (0 to 8).\n\nLevels:")
  })

  it("reads long work from both ends", () => {
    const words = Array.from({ length: 3000 }, (_, i) => `w${i}`)
    const { work, cut } = workForMarking(words.join(" "))
    expect(cut).toBe(true)
    expect(work.split(/\s+/)).toEqual([...words.slice(0, 1800), "[…]", ...words.slice(-600)])
    expect(workForMarking("short work")).toEqual({ work: "short work", cut: false })
  })

  it("reads the mark and comments from the model's answer, scaling the mark to the criterion's maximum", () => {
    const reply = "6\nWhy: The movement is explained in detail but the critique **lacks depth**.\nTo improve: Link each feature of the painting to its effect."
    expect(parseMark(reply, 8)).toEqual({ score: 6, why: "The movement is explained in detail but the critique lacks depth.", improve: "Link each feature of the painting to its effect." })
    expect(parseMark(reply, 10).score).toBe(8)
    expect(parseMark("4", 8)).toEqual({ score: 4, why: "", improve: "" }) // the mark arrives first, before the comments
    expect(parseMark("The work is good.", 8).score).toBeNull()
    expect(parseMark("9\nWhy: x", 8).score).toBeNull()
  })

  it("tells the marker what each criterion asks for, except those judged from a performance", () => {
    const arts = gradeTask(req({ subjectName: "Visual Arts", subjectGroup: "Arts", criteria: "A,C" }), narrativeStrong)
    expect(arts.criteria.map((c) => c.asks)).toEqual([["investigate a movement or genre", "critique an artwork or performance from it"], undefined])
  })
})
