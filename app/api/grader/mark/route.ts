import { NextResponse, type NextRequest } from "next/server"
import { getSessionUser } from "@/lib/auth/session"
import { markHosted, markRequest } from "@/lib/grader/ai/hosted"

// The hosted model answers in a few seconds, but allow for a slow one.
export const maxDuration = 60

/**
 * Marks work with the hosted open-source model. Signed-in students only: the free allowance is shared.
 * shortcut: no per-student limit, so one student can use up the day's allowance; add one (it needs a table) if that happens.
 */
export async function POST(request: NextRequest) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 })

  const key = process.env.GROQ_API_KEY
  if (!key) return NextResponse.json({ reason: "unavailable" }, { status: 503 })

  const parsed = markRequest.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ reason: "failed" }, { status: 400 })

  const result = await markHosted(parsed.data, key)
  const headers = { "Cache-Control": "no-store" }
  if (result.ok) return NextResponse.json({ marks: result.marks }, { headers })
  return NextResponse.json({ reason: result.reason, retryAfter: result.retryAfter }, { status: result.reason === "busy" ? 429 : 502, headers })
}
