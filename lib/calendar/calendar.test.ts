import { describe, expect, it } from "vitest"
import { normalizeGoogleFeedUrl } from "./google-url"
import { buildIcs, escapeText, foldLine } from "./ics-export"

describe("normalizeGoogleFeedUrl", () => {
  const good = "https://calendar.google.com/calendar/ical/student%40gmail.com/private-0123456789abcdef/basic.ics"
  it("accepts Google's secret iCal address", () => {
    expect(normalizeGoogleFeedUrl(`  ${good} `)).toEqual({ ok: true, url: good, host: "calendar.google.com" })
  })
  it("upgrades webcal:// and http://", () => {
    expect(normalizeGoogleFeedUrl(good.replace("https://", "webcal://")).ok).toBe(true)
    expect(normalizeGoogleFeedUrl(good.replace("https://", "http://")).ok).toBe(true)
  })
  it.each([
    ["https://calendar.google.com.evil.io/calendar/ical/x/basic.ics"],
    ["https://evil.io/calendar.google.com/calendar/ical/x/basic.ics"],
    ["https://calendar.google.com/calendar/u/0/r"],
    ["https://user:pw@calendar.google.com/calendar/ical/x/basic.ics"],
    ["https://isb.managebac.com/student/events.ics"],
    [""],
  ])("rejects %s", (input) => {
    expect(normalizeGoogleFeedUrl(input).ok).toBe(false)
  })
})

describe("ics export", () => {
  it("escapes text per RFC 5545", () => {
    expect(escapeText("Paper 1; Section A, B\nBring calc\\pen")).toBe("Paper 1\\; Section A\\, B\\nBring calc\\\\pen")
  })
  it("folds long lines at 75 octets", () => {
    const folded = foldLine(`SUMMARY:${"x".repeat(100)}`)
    const lines = folded.split("\r\n")
    expect(lines[0].length).toBe(75)
    expect(lines[1].startsWith(" ")).toBe(true)
    expect(lines.join("").replace(/ /g, "")).toBe(`SUMMARY:${"x".repeat(100)}`)
  })
  it("builds all-day and timed events with stable UIDs", () => {
    const ics = buildIcs({
      name: "Academia",
      stamp: "2026-10-30T10:00:00.000Z",
      items: [
        { uid: "a-1", title: "Geometry test", allDay: true, date: "2026-11-10", description: "Mathematics · Exam" },
        { uid: "r-1", title: "Bring calculator", allDay: false, start: "2026-11-09T07:30:00.000Z", end: null },
      ],
    })
    expect(ics.startsWith("BEGIN:VCALENDAR\r\nVERSION:2.0\r\n")).toBe(true)
    expect(ics).toContain("X-WR-CALNAME:Academia")
    expect(ics).toContain("UID:a-1@academia\r\nDTSTAMP:20261030T100000Z\r\nDTSTART;VALUE=DATE:20261110\r\nDTEND;VALUE=DATE:20261111")
    expect(ics).toContain("DTSTART:20261109T073000Z\r\nDTEND:20261109T080000Z")
    expect(ics).toContain("SUMMARY:Geometry test")
    expect(ics.trimEnd().endsWith("END:VCALENDAR")).toBe(true)
  })
})
