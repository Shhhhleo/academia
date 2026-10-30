import { describe, expect, it } from "vitest"
import { normalizeGoogleFeedUrl } from "./google-url"
import { parseIcs } from "@/lib/managebac/ics"
import { itemDay, staleIds } from "@/lib/managebac/reconcile"
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

describe("parseIcs with a window (Google import)", () => {
  const cal = (...events: string[][]) =>
    `BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//test//EN\r\n${events.map((l) => `BEGIN:VEVENT\r\n${l.join("\r\n")}\r\nEND:VEVENT\r\n`).join("")}END:VCALENDAR\r\n`
  const october = { from: Date.UTC(2026, 9, 1), to: Date.UTC(2026, 10, 1) }
  const series = ["UID:series-1@google.com", "DTSTART:20260105T150000Z", "DTEND:20260105T160000Z", "RRULE:FREQ=WEEKLY", "EXDATE:20261012T150000Z", "SUMMARY:Robotics"]
  const moved = ["UID:series-1@google.com", "RECURRENCE-ID:20261019T150000Z", "DTSTART:20261019T170000Z", "DTEND:20261019T180000Z", "SUMMARY:Robotics (moved)"]
  const cancelled = ["UID:series-1@google.com", "RECURRENCE-ID:20261026T150000Z", "DTSTART:20261026T150000Z", "STATUS:CANCELLED", "SUMMARY:Robotics"]

  it("expands a weekly series inside the window, honouring EXDATE", () => {
    const items = parseIcs(cal(series), october)
    expect(items.map((i) => i.startsAt)).toEqual(["2026-10-05T15:00:00.000Z", "2026-10-19T15:00:00.000Z", "2026-10-26T15:00:00.000Z"])
    expect(items.map((i) => i.uid)).toEqual([
      "series-1@google.com#2026-10-05T15:00:00.000Z",
      "series-1@google.com#2026-10-19T15:00:00.000Z",
      "series-1@google.com#2026-10-26T15:00:00.000Z",
    ])
  })

  it("lets modified and cancelled instances replace their occurrence without duplicate keys", () => {
    const items = parseIcs(cal(series, moved, cancelled), october)
    expect(items.map((i) => [i.title, i.startsAt])).toEqual([
      ["Robotics", "2026-10-05T15:00:00.000Z"],
      ["Robotics (moved)", "2026-10-19T17:00:00.000Z"],
    ])
    expect(new Set(items.map((i) => i.uid)).size).toBe(items.length)
  })

  it("expands all-day series as calendar dates", () => {
    const items = parseIcs(cal(["UID:club@google.com", "DTSTART;VALUE=DATE:20260901", "RRULE:FREQ=MONTHLY;COUNT=3", "SUMMARY:Club day"]), october)
    expect(items).toEqual([expect.objectContaining({ uid: "club@google.com#2026-10-01", allDay: true, date: "2026-10-01" })])
  })

  it("keeps a modified instance whose series is missing", () => {
    expect(parseIcs(cal(moved), october).map((i) => i.uid)).toEqual(["series-1@google.com#2026-10-19T15:00:00.000Z"])
  })

  it("applies the window before the size cap", () => {
    const past = Array.from({ length: 2100 }, (_, n) => [`UID:old-${n}`, "DTSTART;VALUE=DATE:20250101", "SUMMARY:Old"])
    const items = parseIcs(cal(...past, ["UID:soon", "DTSTART;VALUE=DATE:20261015", "SUMMARY:Soon"]), october)
    expect(items.map((i) => i.uid)).toEqual(["soon"])
  })

  it("keeps stored UIDs within 300 characters", () => {
    const long = "x".repeat(400)
    const [plain] = parseIcs(cal([`UID:${long}`, "DTSTART;VALUE=DATE:20261015", "SUMMARY:Long"]))
    expect(plain.uid.length).toBeLessThanOrEqual(300)
    const occurrences = parseIcs(cal([`UID:${long}`, "DTSTART;VALUE=DATE:20261005", "RRULE:FREQ=WEEKLY;COUNT=2", "SUMMARY:Long"]), october)
    expect(occurrences).toHaveLength(2)
    expect(occurrences.every((i) => i.uid.length <= 300)).toBe(true)
    expect(occurrences[0].uid).not.toBe(occurrences[1].uid)
  })

  it("without a window keeps one item per series, as ManageBac expects", () => {
    expect(parseIcs(cal(series, moved)).map((i) => i.uid)).toEqual(["series-1@google.com"])
  })
})

describe("sync reconciliation", () => {
  it("dates a timed item by the student's timezone", () => {
    const due = { uid: "a", title: "Essay", description: null, allDay: false, startsAt: "2026-10-30T03:59:00.000Z" }
    expect(itemDay(due, "America/New_York")).toBe("2026-10-29")
    expect(itemDay(due, "Asia/Tokyo")).toBe("2026-10-30")
    expect(itemDay({ uid: "b", title: "Day", description: null, allDay: true, date: "2026-11-02" }, "Asia/Tokyo")).toBe("2026-11-02")
  })

  it("finds synced rows that left the feed, keeping older history", () => {
    const rows = [
      { id: "1", external_uid: "kept", day: "2026-11-01" },
      { id: "2", external_uid: "gone", day: "2026-11-01" },
      { id: "3", external_uid: "gone-old", day: "2026-09-01" },
      { id: "4", external_uid: null, day: "2026-11-01" },
    ]
    expect(staleIds(rows, new Set(["kept"]), (r) => r.day, "2026-10-01")).toEqual(["2"])
  })
})

describe("buildIcs edge cases", () => {
  it("escapes a lone carriage return so a title can't start a new property", () => {
    expect(escapeText("Test\rDTSTART:19700101")).toBe(String.raw`Test\nDTSTART:19700101`)
  })
  it("exports multi-day all-day events with an exclusive end date", () => {
    const ics = buildIcs({ name: "A", stamp: "2026-10-30T00:00:00Z", items: [{ uid: "trip", title: "Trip", allDay: true, date: "2026-11-02", endDate: "2026-11-04" }] })
    expect(ics).toContain("DTSTART;VALUE=DATE:20261102\r\nDTEND;VALUE=DATE:20261105")
  })
})
