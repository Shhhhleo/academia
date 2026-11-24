import type { ChatMessage } from "./protocol"

export interface MarkInput {
  programme: "MYP" | "DP"
  year: number
  subjectName: string
  taskType: string
  task?: string
  /** The criteria the AI can mark, each with what it asks for (its strands). */
  criteria: { id: string; name: string; max: number; asks: string[] }[]
  text: string
}

// shortcut: a 4 GB graphics card holds about 2,400 words of work beside the model; longer work is read from both ends. Raise when models that list fewer scores per token are published.
const MAX_WORDS = 2400
const HEAD_WORDS = 1800

/** The work as the model reads it, and whether the middle was cut out. */
export function workForMarking(text: string) {
  const words = text.trim().split(/\s+/)
  if (words.length <= MAX_WORDS) return { work: text.trim(), cut: false }
  return { work: `${words.slice(0, HEAD_WORDS).join(" ")}\n[…]\n${words.slice(HEAD_WORDS - MAX_WORDS).join(" ")}`, cut: true }
}

const NUMERALS = ["i", "ii", "iii", "iv", "v", "vi"]

// Shared by the on-device and the hosted marker.
export const student = (input: MarkInput) => (input.programme === "MYP" ? `an MYP Year ${input.year}` : "a Diploma Programme")
export const STRICT =
  "You give the mark a moderator would agree with. Be strict: long, fluent or well-referenced work is not automatically good. Judge the depth, accuracy and relevance of the thinking, and whether each part really does what the criterion asks."
export const LEVELS = `Levels:
1-2 limited: lists a few facts or steps with little explanation; mostly description; gaps or errors
3-4 adequate: covers the main points with some explanation, but parts are thin, generic, descriptive or not linked together
5-6 substantial: detailed and mostly accurate, explains reasons and effects, clearly linked to the task or statement of inquiry, with some depth missing
7-8 excellent: thorough, accurate and insightful throughout, precise subject vocabulary, every part justified and linked to the task or statement of inquiry`
/** What a criterion asks for, as the numbered strands of the rubric. */
export const strands = (asks: string[]) => asks.map((a, i) => `${NUMERALS[i] ?? i + 1}. ${a}`).join("\n")

/**
 * Chat messages asking the on-device model to mark the work on one criterion.
 * Every criterion is marked on the MYP's 0–8 scale (two marks per level) and scaled to its own maximum by parseMark.
 */
export function buildMarkMessages(input: MarkInput, criterion: MarkInput["criteria"][number]): ChatMessage[] {
  const asks = criterion.asks.length ? ` The student should:\n${strands(criterion.asks)}` : ""
  return [
    {
      role: "system",
      content: `You are an experienced IB ${input.subjectName} teacher marking ${student(input)} student's work against one criterion. ${STRICT}`,
    },
    {
      role: "user",
      content: `Criterion ${criterion.id}: ${criterion.name} (0 to 8).${asks}
${input.task?.trim() ? `\nThe task was: ${input.task.trim()}\n` : ""}
${LEVELS}

The student's work (${input.taskType}):
"""
${workForMarking(input.text).work}
"""

Mark the work on Criterion ${criterion.id}. Answer in exactly this layout:
Mark: a whole number from 0 to 8
Why: one sentence on what the work does well and what it lacks for this criterion
To improve: one sentence with the single most useful change /no_think`,
    },
  ]
}

/** The start of the model's answer, written for it: the next thing it writes is the mark, so the mark arrives first. */
export const MARK_PREFILL = "<think>\n\n</think>\n\nMark: "

/** Room for the mark and two sentences. */
export const MARK_TOKENS = 100

/** Reads the model's answer (which continues MARK_PREFILL): the mark scaled to the criterion's maximum, and its two comments. */
export function parseMark(reply: string, max: number) {
  const level = reply.match(/^\s*([0-8])(?!\d)/)?.[1]
  const field = (label: string) => reply.match(new RegExp(`^${label}:[ \\t]*(.+)$`, "im"))?.[1].replace(/\*\*/g, "").trim() ?? ""
  return { score: level === undefined ? null : Math.round((Number(level) / 8) * max), why: field("Why"), improve: field("To improve") }
}
