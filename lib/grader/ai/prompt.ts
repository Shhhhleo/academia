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

export interface ParsedFeedback {
  blocks: { title: string; strength: string; improve: string }[]
  next: string
}

/**
 * Splits the model's answer (the layout asked for above) into a block per criterion and the next step.
 * Null when it wrote something else, so the page can show the text as it is.
 */
export function parseFeedback(text: string): ParsedFeedback | null {
  const blocks: ParsedFeedback["blocks"] = []
  let next = ""
  let field: "strength" | "improve" | "next" | null = null
  for (const raw of text.split("\n")) {
    const line = raw.replace(/\*\*/g, "").replace(/^#+\s*/, "").trim()
    if (!line) continue
    if (/^Criterion\s+[A-Z]\d?\b/i.test(line)) {
      blocks.push({ title: line.replace(/:$/, ""), strength: "", improve: "" })
      field = null
      continue
    }
    const labelled = line.match(/^[-•*]?\s*(Strength|Improve(?:ment)?|Next step)s?\s*:\s*(.*)$/i)
    if (labelled) {
      field = /^next/i.test(labelled[1]) ? "next" : /^strength/i.test(labelled[1]) ? "strength" : "improve"
      if (field === "next") next = labelled[2]
      else {
        if (!blocks.length) blocks.push({ title: "", strength: "", improve: "" })
        blocks[blocks.length - 1][field] = labelled[2]
      }
      continue
    }
    if (field === "next") next += ` ${line}`
    else if (field && blocks.length) blocks[blocks.length - 1][field] += ` ${line}`
    else return null
  }
  return blocks.length || next ? { blocks, next } : null
}

/** Enough room for two lines per criterion plus the next step, without letting a small model ramble. */
export const feedbackTokens = (criteria: number) => Math.min(600, 110 * criteria + 70)
