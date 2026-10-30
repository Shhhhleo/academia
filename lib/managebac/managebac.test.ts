import { readFileSync } from "node:fs"
import { join } from "node:path"
import { beforeAll, describe, expect, it } from "vitest"
import { decryptSecret, encryptSecret } from "@/lib/crypto/secret"
import { normalizeFeedUrl } from "./feed-url"
import { inferKind, matchSubject, parseIcs } from "./ics"

const fixture = readFileSync(join(__dirname, "__fixtures__", "sample.ics"), "utf8")

describe("normalizeFeedUrl", () => {
  it("converts webcal:// to https", () => {
    expect(normalizeFeedUrl("webcal://isb.managebac.com/student/events/token/abc.ics")).toEqual({
      ok: true,
      url: "https://isb.managebac.com/student/events/token/abc.ics",
      host: "isb.managebac.com",
    })
  })
  it("trims surrounding spaces", () => {
    expect(normalizeFeedUrl("  https://isb.managebac.com/x.ics \n")).toMatchObject({ ok: true, url: "https://isb.managebac.com/x.ics" })
  })
  it("upgrades http to https", () => {
    expect(normalizeFeedUrl("http://isb.managebac.com/x.ics")).toMatchObject({ ok: true, url: "https://isb.managebac.com/x.ics" })
  })
  it("accepts managebac.cn and the bare domain", () => {
    expect(normalizeFeedUrl("https://school.managebac.cn/x.ics").ok).toBe(true)
    expect(normalizeFeedUrl("https://managebac.com/x.ics").ok).toBe(true)
  })
  it.each([
    ["https://managebac.com.evil.io/x.ics"],
    ["https://evil.io/isb.managebac.com"],
    ["https://evilmanagebac.com/x.ics"],
    ["https://user:pw@isb.managebac.com/x"],
    ["https://isb.managebac.com:8443/x"],
    ["https://127.0.0.1/x"],
    ["ftp://isb.managebac.com/x"],
    ["javascript:alert(1)"],
    [""],
  ])("rejects %s", (input) => {
    const r = normalizeFeedUrl(input)
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error.length).toBeGreaterThan(10)
  })
})

describe("encryptSecret", () => {
  beforeAll(() => {
    process.env.ENCRYPTION_KEY = Buffer.alloc(32, 7).toString("base64")
  })
  it("round-trips", () => {
    expect(decryptSecret(encryptSecret("https://isb.managebac.com/t/abc.ics"))).toBe("https://isb.managebac.com/t/abc.ics")
  })
  it("uses a fresh IV each time", () => {
    expect(encryptSecret("same")).not.toBe(encryptSecret("same"))
  })
  it("rejects a tampered token", () => {
    const t = encryptSecret("secret")
    const parts = t.split(".")
    parts[3] = parts[3].slice(0, -2) + (parts[3].endsWith("AA") ? "BB" : "AA")
    expect(() => decryptSecret(parts.join("."))).toThrow()
  })
})

describe("parseIcs", () => {
  const items = parseIcs(fixture)
  it("parses every VEVENT", () => {
    expect(items).toHaveLength(3)
  })
  it("all-day stays date-only", () => {
    expect(items[0]).toMatchObject({ uid: "task-1001@isb.managebac.com", allDay: true, date: "2026-11-05" })
    expect(items[0].startsAt).toBeUndefined()
  })
  it("timed events keep ISO instants", () => {
    expect(items[1]).toMatchObject({ allDay: false, startsAt: "2026-11-10T03:00:00.000Z", endsAt: "2026-11-10T04:30:00.000Z" })
  })
  it("unescapes text", () => {
    expect(items[0].description).toBe("Criteria A, B, C and D. Submit via ManageBac.")
  })
  it("upsert keys are stable", () => {
    expect(parseIcs(fixture).map((i) => i.uid)).toEqual(items.map((i) => i.uid))
  })
  it("returns [] for garbage", () => {
    expect(parseIcs("<html>not a calendar</html>")).toEqual([])
  })
})

describe("matchSubject", () => {
  const subjects = [
    { id: "ll", name: "Language and Literature", managebacMatch: "Language & Literature" },
    { id: "math", name: "Mathematics", managebacMatch: "Extended Mathematics" },
    { id: "lit", name: "Literature", managebacMatch: null },
  ]
  it("matches the managebac class name case-insensitively, treating & as and", () => {
    expect(matchSubject("Summative: Unit 3 essay (MYP Language & Literature)", subjects)).toBe("ll")
  })
  it("prefers the most specific match", () => {
    expect(matchSubject("Mock Exam - Extended Mathematics", subjects)).toBe("math")
  })
  it("returns null when nothing matches", () => {
    expect(matchSubject("Grade 10 Parent Conferences", subjects)).toBeNull()
  })
})

describe("inferKind", () => {
  it.each([
    ["Mock Exam - Maths", { event: "exam", assessment: "mock" }],
    ["Chemistry Exam", { event: "exam", assessment: "exam" }],
    ["Summative: essay", { event: "deadline", assessment: "summative" }],
    ["IA draft due", { event: "deadline", assessment: "ia" }],
    ["Formative quiz", { event: "exam", assessment: "formative" }],
    ["Parent conferences", { event: "event", assessment: null }],
  ])("%s", (title, expected) => {
    expect(inferKind(title)).toEqual(expected)
  })
})
