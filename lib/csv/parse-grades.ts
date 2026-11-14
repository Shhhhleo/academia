import { CRITERIA, type Criterion } from "@/lib/grades"

const KINDS = ["summative", "exam", "mock", "ia", "formative", "other"] as const
const HEADER = ["subject", "title", "date", "kind", "score", "max", "a", "b", "c", "d"]
export const CSV_MAX_ROWS = 500

export interface CsvRow {
  line: number
  subject: string
  title: string
  date: string
  kind: (typeof KINDS)[number]
  score: number | null
  max: number | null
  criteria: Partial<Record<Criterion, number>>
}

/** Minimal RFC 4180 parser: quoted fields, doubled quotes, CRLF/LF, leading BOM. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ""
  let quoted = false
  const s = text.replace(/^﻿/, "")
  for (let i = 0; i < s.length; i++) {
    const ch = s[i]
    if (quoted) {
      if (ch === '"' && s[i + 1] === '"') {
        field += '"'
        i++
      } else if (ch === '"') quoted = false
      else field += ch
    } else if (ch === '"') quoted = true
    else if (ch === ",") {
      row.push(field)
      field = ""
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && s[i + 1] === "\n") i++
      row.push(field)
      rows.push(row)
      row = []
      field = ""
    } else field += ch
  }
  if (field !== "" || row.length) {
    row.push(field)
    rows.push(row)
  }
  return rows.filter((r) => r.some((c) => c.trim() !== ""))
}

const ISO = /^\d{4}-\d{2}-\d{2}$/
const validDate = (d: string) => ISO.test(d) && !Number.isNaN(Date.parse(`${d}T00:00:00Z`)) && new Date(`${d}T00:00:00Z`).toISOString().startsWith(d)

export function parseGradesCsv(text: string): { rows: CsvRow[]; errors: string[] } {
  const table = parseCsv(text)
  const head = (table[0] ?? []).map((h) => h.trim().toLowerCase())
  if (HEADER.some((h, i) => head[i] !== h)) {
    return { rows: [], errors: [`The first line must be the header: ${HEADER.join(",")}`] }
  }
  if (table.length - 1 > CSV_MAX_ROWS) return { rows: [], errors: [`Import at most ${CSV_MAX_ROWS} rows at a time.`] }

  const rows: CsvRow[] = []
  const errors: string[] = []
  table.slice(1).forEach((cells, i) => {
    const line = i + 2
    const [subject, title, date, kindRaw, score, max, ...crit] = cells.map((c) => (c ?? "").trim())
    const fail = (msg: string) => errors.push(`Line ${line}: ${msg}`)
    if (!subject) return fail("subject is required.")
    if (!title) return fail("title is required.")
    if (!validDate(date ?? "")) return fail("date must be YYYY-MM-DD.")
    const kind = (kindRaw || "summative").toLowerCase()
    if (!(KINDS as readonly string[]).includes(kind)) return fail(`kind must be one of ${KINDS.join(", ")}.`)

    const criteria: Partial<Record<Criterion, number>> = {}
    for (const [j, c] of CRITERIA.entries()) {
      const v = crit[j]
      if (!v) continue
      const n = Number(v)
      if (!Number.isInteger(n) || n < 0 || n > 8) return fail("criterion levels must be whole numbers from 0 to 8.")
      criteria[c] = n
    }
    const s = score ? Number(score) : null
    const m = max ? Number(max) : null
    if ((s != null && !Number.isFinite(s)) || (m != null && !(m > 0))) return fail("score and max must be numbers, and max above 0.")
    if (s != null && (m == null || s < 0 || s > m)) return fail("score must be between 0 and max.")
    if (s == null && Object.keys(criteria).length === 0) return fail("add a score/max or at least one criterion level.")

    rows.push({ line, subject, title: title.slice(0, 160), date, kind: kind as CsvRow["kind"], score: s, max: m, criteria })
  })
  return { rows, errors }
}
