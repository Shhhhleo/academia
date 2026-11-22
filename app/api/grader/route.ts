import { NextResponse, type NextRequest } from "next/server"
import { getSessionUser } from "@/lib/auth/session"
import { gradeRequest } from "@/lib/grader/rubrics"
import { gradeTask } from "@/lib/grader/score"

// Files are read in the browser (components/grader/task-grader.tsx); only text arrives here.
export async function POST(request: NextRequest) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 })

  const form = await request.formData()
  const parsed = gradeRequest.safeParse(Object.fromEntries([...form.entries()].filter(([, v]) => typeof v === "string" && v !== "")))
  if (!parsed.success) return NextResponse.json({ error: "Check the form: some fields are missing or invalid." }, { status: 400 })

  const text = parsed.data.text ?? ""
  if (!text.trim()) return NextResponse.json({ error: "Upload your work or paste it in." }, { status: 400 })

  return NextResponse.json(gradeTask(parsed.data, text), { headers: { "Cache-Control": "no-store" } })
}
