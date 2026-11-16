import mammoth from "mammoth"
import { NextResponse, type NextRequest } from "next/server"
import { extractText } from "unpdf"
import { getSessionUser } from "@/lib/auth/session"
import { gradeRequest } from "@/lib/grader/rubrics"
import { gradeTask } from "@/lib/grader/score"

// shortcut: Vercel caps request bodies at ~4.5 MB; move uploads to Supabase Storage if bigger files are needed.
const MAX_FILE_BYTES = 4 * 1024 * 1024
const DOCX = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"

async function readFile(file: File): Promise<string | { error: string; status: number }> {
  if (file.size > MAX_FILE_BYTES) return { error: "That file is over 4 MB. Try a smaller file or paste the text.", status: 413 }
  const buffer = Buffer.from(await file.arrayBuffer())
  if (file.type === "application/pdf" || /\.pdf$/i.test(file.name)) return (await extractText(new Uint8Array(buffer), { mergePages: true })).text
  if (file.type === DOCX || /\.docx$/i.test(file.name)) return (await mammoth.extractRawText({ buffer })).value
  if (file.type.startsWith("text/") || /\.(txt|md)$/i.test(file.name)) return buffer.toString("utf8")
  return { error: "Upload a PDF, Word (.docx) or .txt file. Photos of handwriting can't be read, so type or paste the text instead.", status: 415 }
}

export async function POST(request: NextRequest) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 })

  const form = await request.formData()
  const parsed = gradeRequest.safeParse(Object.fromEntries([...form.entries()].filter(([, v]) => typeof v === "string" && v !== "")))
  if (!parsed.success) return NextResponse.json({ error: "Check the form: some fields are missing or invalid." }, { status: 400 })

  let text = parsed.data.text ?? ""
  const file = form.get("file")
  if (file instanceof File && file.size > 0) {
    try {
      const read = await readFile(file)
      if (typeof read !== "string") return NextResponse.json({ error: read.error }, { status: read.status })
      if (!read.trim() && !text.trim()) {
        return NextResponse.json({ error: "No text found in that file. If it's a scanned PDF, upload a typed version or paste the text." }, { status: 422 })
      }
      text = `${read}\n\n${text}`
    } catch (error) {
      console.error("grader: could not read file", error)
      return NextResponse.json({ error: "That file couldn't be opened. Try saving it again as PDF or Word, or paste the text." }, { status: 422 })
    }
  }
  if (!text.trim()) return NextResponse.json({ error: "Upload your work or paste it in." }, { status: 400 })

  return NextResponse.json(gradeTask(parsed.data, text), { headers: { "Cache-Control": "no-store" } })
}
