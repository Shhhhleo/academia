import { describe, expect, it } from "vitest"
import { parseCsv, parseGradesCsv } from "./parse-grades"

describe("parseCsv", () => {
  it("handles quotes, escaped quotes, CRLF and a BOM", () => {
    expect(parseCsv('﻿a,b\r\n"x, y","he said ""hi"""\r\n')).toEqual([
      ["a", "b"],
      ["x, y", 'he said "hi"'],
    ])
  })
})

describe("parseGradesCsv", () => {
  const header = "subject,title,date,kind,score,max,A,B,C,D"

  it("parses MYP criteria and DP score rows", () => {
    const r = parseGradesCsv(`${header}\nSciences,Lab report,2026-09-18,summative,,,6,5,7,6\nPhysics,Paper 1,2026-10-02,exam,31,40,,,,`)
    expect(r.errors).toEqual([])
    expect(r.rows).toEqual([
      { line: 2, subject: "Sciences", title: "Lab report", date: "2026-09-18", kind: "summative", score: null, max: null, criteria: { A: 6, B: 5, C: 7, D: 6 } },
      { line: 3, subject: "Physics", title: "Paper 1", date: "2026-10-02", kind: "exam", score: 31, max: 40, criteria: {} },
    ])
  })

  it("reports row-level errors without dropping valid rows", () => {
    const r = parseGradesCsv(`${header}\nSciences,,2026-09-18,summative,,,6,,,\nMaths,Test,18/09/2026,exam,10,20,,,,\nArt,Study,2026-10-01,summative,,,9,,,\nPHE,Plan,2026-10-02,,,,4,5,4,5`)
    expect(r.rows.map((x) => x.title)).toEqual(["Plan"])
    expect(r.rows[0].kind).toBe("summative")
    expect(r.errors).toEqual([
      "Line 2: title is required.",
      "Line 3: date must be YYYY-MM-DD.",
      "Line 4: criterion levels must be whole numbers from 0 to 8.",
    ])
  })

  it("requires the header", () => {
    expect(parseGradesCsv("foo,bar\n1,2").errors[0]).toMatch(/header/i)
  })

  it("caps the number of rows", () => {
    const body = Array.from({ length: 501 }, (_, i) => `S,T${i},2026-09-01,summative,1,2,,,,`).join("\n")
    expect(parseGradesCsv(`${header}\n${body}`).errors[0]).toMatch(/500/)
  })
})
