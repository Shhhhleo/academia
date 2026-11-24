// Marks the work with an open-source model on a hosted service, so students download nothing.
// Used on the server only: it needs the provider's key, and the student's work is sent to the provider to be marked.
import { z } from "zod"
import { LEVELS, STRICT, strands, student, workForMarking, type MarkInput } from "./prompt"
import type { ChatMessage } from "./protocol"

/**
 * An open-weight model served by Groq. Groq's free plan allows it 30 requests and 8,000 tokens a minute,
 * and 1,000 requests and 200,000 tokens a day, shared by every student: about one long task a minute.
 */
export const HOSTED_MODEL = "openai/gpt-oss-120b"
const ENDPOINT = "https://api.groq.com/openai/v1/chat/completions"

/** What the page sends to be marked. Trust boundary: validated on the server. */
export const markRequest = z.object({
  programme: z.enum(["MYP", "DP"]),
  year: z.coerce.number().int().min(1).max(5),
  subjectName: z.string().trim().min(1).max(120),
  taskType: z.string().trim().min(1).max(60),
  task: z.string().max(5_000).optional(),
  criteria: z
    .array(z.object({ id: z.string().trim().min(1).max(4), name: z.string().trim().min(1).max(80), max: z.number().int().min(1).max(40), asks: z.array(z.string().trim().max(200)).max(8) }))
    .min(1)
    .max(8),
  text: z.string().trim().min(1).max(200_000),
}) satisfies z.ZodType<MarkInput>

export interface Mark {
  /** The mark on the criterion's own scale; null when the marker gave none. */
  score: number | null
  why: string
  improve: string
}

/** Chat messages asking the model to mark the work on every criterion at once: the work is sent a single time, which the per-minute token limit needs. */
export function buildHostedMessages(input: MarkInput): ChatMessage[] {
  const criteria = input.criteria.map((c) => `Criterion ${c.id}: ${c.name}.${c.asks.length ? ` The student should:\n${strands(c.asks)}` : ""}`).join("\n\n")
  return [
    {
      role: "system",
      content: `You are an experienced IB ${input.subjectName} teacher marking ${student(input)} student's work, one criterion at a time. ${STRICT}`,
    },
    {
      role: "user",
      content: `Mark this work (${input.taskType}) on each criterion below, each from 0 to 8, judging each on its own.

${criteria}
${input.task?.trim() ? `\nThe task was: ${input.task.trim()}\n` : ""}
${LEVELS}

The student's work:
"""
${workForMarking(input.text).work}
"""

For each criterion give: "why", one sentence on what the work does well and what it lacks for that criterion; "improve", one sentence with the single most useful change; then "mark", a whole number from 0 to 8. Work that does not address a criterion gets a low mark on it.`,
    },
  ]
}

const answer = z.object({ criteria: z.array(z.object({ id: z.string(), why: z.string(), improve: z.string(), mark: z.number() })) })

/** The model's answer as a mark per criterion asked about, each scaled from 0–8 to the criterion's maximum. Null if it can't be read. */
export function readHostedAnswer(content: string, criteria: MarkInput["criteria"]): Record<string, Mark> | null {
  let parsed
  try {
    parsed = answer.safeParse(JSON.parse(content))
  } catch {
    return null
  }
  if (!parsed.success) return null
  const marks: Record<string, Mark> = {}
  for (const c of criteria) {
    // The model sometimes writes "Criterion A" for "A".
    const got = parsed.data.criteria.find((x) => x.id.trim().toUpperCase().replace(/^CRITERION\s+/, "") === c.id.toUpperCase())
    if (got) marks[c.id] = { score: Math.round((Math.min(8, Math.max(0, Math.round(got.mark))) / 8) * c.max), why: got.why.trim(), improve: got.improve.trim() }
  }
  return Object.keys(marks).length ? marks : null
}

export type HostedResult = { ok: true; marks: Record<string, Mark> } | { ok: false; reason: "busy" | "failed"; retryAfter?: number }

/** Sends the work to the hosted model and returns its marks. "busy" means the free allowance is used up for now. */
export async function markHosted(input: MarkInput, apiKey: string, fetcher: typeof fetch = fetch): Promise<HostedResult> {
  const item = { type: "object", properties: { id: { type: "string", enum: input.criteria.map((c) => c.id) }, why: { type: "string" }, improve: { type: "string" }, mark: { type: "integer" } }, required: ["id", "why", "improve", "mark"], additionalProperties: false }
  try {
    const res = await fetcher(ENDPOINT, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: HOSTED_MODEL,
        messages: buildHostedMessages(input),
        temperature: 0,
        reasoning_effort: "low",
        include_reasoning: false,
        max_completion_tokens: 1500,
        response_format: {
          type: "json_schema",
          json_schema: { name: "marks", strict: true, schema: { type: "object", properties: { criteria: { type: "array", items: item } }, required: ["criteria"], additionalProperties: false } },
        },
      }),
      signal: AbortSignal.timeout(45_000),
    })
    if (res.status === 429) return { ok: false, reason: "busy", retryAfter: Math.ceil(Number(res.headers.get("retry-after"))) || 60 }
    if (!res.ok) {
      // The status only: never log the student's work.
      console.error("grader: hosted marker answered", res.status)
      return { ok: false, reason: "failed" }
    }
    const content = (await res.json())?.choices?.[0]?.message?.content
    const marks = typeof content === "string" ? readHostedAnswer(content, input.criteria) : null
    return marks ? { ok: true, marks } : { ok: false, reason: "failed" }
  } catch (err) {
    console.error("grader: hosted marker failed", err instanceof Error ? err.name : "error")
    return { ok: false, reason: "failed" }
  }
}
