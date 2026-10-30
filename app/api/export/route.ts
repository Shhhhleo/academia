import { NextResponse, type NextRequest } from "next/server"
import { getSessionUser } from "@/lib/auth/session"
import { csvCell } from "@/lib/csv/write"
import { createClient } from "@/lib/supabase/server"

/** Downloads the signed-in user's own data (RLS scopes every query). */
export async function GET(request: NextRequest) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 })
  const supabase = await createClient()
  const format = request.nextUrl.searchParams.get("format") === "csv" ? "csv" : "json"
  const stamp = new Date().toISOString().slice(0, 10)
  const headers = { "Cache-Control": "no-store" }

  if (format === "csv") {
    const { data } = await supabase
      .from("assessments")
      .select("title, kind, status, due_on, counts, raw_score, max_score, weight, criteria, notes, source, subjects(name)")
      .order("due_on")
    const rows = (data ?? []).map((a) => {
      const c = (a.criteria ?? {}) as Record<string, number | null>
      const subject = (a.subjects as unknown as { name: string } | null)?.name ?? ""
      return [subject, a.title, a.kind, a.status, a.due_on, a.counts, a.raw_score, a.max_score, a.weight, c.A, c.B, c.C, c.D, a.notes, a.source]
    })
    const head = ["subject", "title", "kind", "status", "date", "counts", "score", "max", "weight", "A", "B", "C", "D", "notes", "source"]
    const body = [head, ...rows].map((r) => r.map(csvCell).join(",")).join("\r\n")
    return new NextResponse(body, {
      headers: { ...headers, "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="academia-assessments-${stamp}.csv"` },
    })
  }

  const tables = ["profiles", "academic_years", "subjects", "components", "assessments", "goals", "events", "notifications"] as const
  const results = await Promise.all(tables.map((t) => supabase.from(t).select("*")))
  const { data: integrations } = await supabase.from("integrations").select("provider, feed_host, status, last_synced_at")
  const payload = {
    exportedAt: new Date().toISOString(),
    account: { id: user.id, email: user.email },
    ...Object.fromEntries(tables.map((t, i) => [t, results[i].data ?? []])),
    integrations: integrations ?? [],
  }
  return new NextResponse(JSON.stringify(payload, null, 2), {
    headers: { ...headers, "Content-Type": "application/json; charset=utf-8", "Content-Disposition": `attachment; filename="academia-export-${stamp}.json"` },
  })
}
