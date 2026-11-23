import type { Mode } from "@/lib/grader/rubrics"
import type { ChatMessage } from "./protocol"

export interface FeedbackInput {
  programme: "MYP" | "DP"
  year: number
  subjectName: string
  taskType: string
  mode: Mode
  task?: string
  criteria: { id: string; name: string; score: number; max: number }[]
  text: string
}

const MODE_WORDS: Record<Mode, string> = {
  analytical: "an analytical piece",
  narrative: "a narrative or descriptive piece",
  persuasive: "a persuasive piece",
  informative: "an informative piece",
}

// shortcut: a 1.7B model reads about 900 words well on a laptop; longer work is cut, and the grade above covers all of it.
const MAX_WORDS = 900

/** Chat messages asking the on-device model for feedback on this piece, criterion by criterion. */
export function buildFeedbackMessages(input: FeedbackInput): ChatMessage[] {
  const words = input.text.trim().split(/\s+/)
  const work = words.slice(0, MAX_WORDS).join(" ") + (words.length > MAX_WORDS ? " […]" : "")
  const criteria = input.criteria.map((c) => `- Criterion ${c.id} (${c.name}): estimated ${c.score}/${c.max}`).join("\n")
  const format = input.criteria.map((c) => `Criterion ${c.id} (${c.name})\nStrength: …\nImprove: …`).join("\n\n")
  return [
    {
      role: "system",
      content:
        "You are an experienced IB teacher giving written feedback to a student. Be specific, honest and encouraging. Only talk about what is actually in the student's work, quoting short phrases from it. Do not change or invent marks. Keep each line to one or two sentences.",
    },
    {
      role: "user",
      content: `Programme: ${input.programme} year ${input.year}, ${input.subjectName}. Task type: ${input.taskType}. This is ${MODE_WORDS[input.mode]}.
${input.task?.trim() ? `The task was: ${input.task.trim()}\n` : ""}
Criteria being assessed:
${criteria}

The student's work:
"""
${work}
"""

For each criterion, write one strength (quote a short phrase from the work) and one specific improvement (quote the words to change and show a better version). Then end with "Next step:" and the single most useful thing to do next. Use exactly this layout:

${format}

Next step: …`,
    },
  ]
}

/** Enough room for two lines per criterion plus the next step, without letting a small model ramble. */
export const feedbackTokens = (criteria: number) => Math.min(600, 110 * criteria + 70)
