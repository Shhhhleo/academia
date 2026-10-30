import { describe, expect, it } from "vitest"
import { computeStreak, dailyTotals, formatMinutes, localDay, weekSummary } from "./streak"

const s = (studied_on: string, minutes: number) => ({ studied_on, minutes })

describe("dailyTotals", () => {
  it("sums sessions per day", () => {
    const t = dailyTotals([s("2026-10-30", 30), s("2026-10-30", 40), s("2026-10-29", 10)])
    expect(t.get("2026-10-30")).toBe(70)
    expect(t.get("2026-10-29")).toBe(10)
  })
})

describe("computeStreak", () => {
  const goal = 60
  it("counts consecutive goal days ending today", () => {
    const t = dailyTotals([s("2026-10-28", 60), s("2026-10-29", 90), s("2026-10-30", 61)])
    expect(computeStreak(t, goal, "2026-10-30")).toMatchObject({ current: 3, metToday: true, atRisk: false, todayMinutes: 61 })
  })
  it("keeps yesterday's streak alive but at risk until today's goal is met", () => {
    const t = dailyTotals([s("2026-10-28", 60), s("2026-10-29", 60), s("2026-10-30", 20)])
    expect(computeStreak(t, goal, "2026-10-30")).toMatchObject({ current: 2, metToday: false, atRisk: true, todayMinutes: 20 })
  })
  it("resets when a day was missed", () => {
    const t = dailyTotals([s("2026-10-27", 60), s("2026-10-29", 30)])
    expect(computeStreak(t, goal, "2026-10-30")).toMatchObject({ current: 0, atRisk: false })
  })
  it("tracks the best streak", () => {
    const t = dailyTotals([s("2026-10-01", 60), s("2026-10-02", 60), s("2026-10-03", 60), s("2026-10-04", 60), s("2026-10-30", 60)])
    expect(computeStreak(t, goal, "2026-10-30")).toMatchObject({ current: 1, best: 4 })
  })
  it("crosses month and year boundaries", () => {
    const t = dailyTotals([s("2026-12-31", 60), s("2027-01-01", 60)])
    expect(computeStreak(t, goal, "2027-01-01").current).toBe(2)
  })
})

describe("weekSummary", () => {
  it("returns 7 days starting on Monday with totals", () => {
    const t = dailyTotals([s("2026-10-26", 30), s("2026-10-30", 45), s("2026-11-02", 99)])
    const w = weekSummary(t, "2026-10-30", 1)
    expect(w.days.map((d) => d.date)).toEqual(["2026-10-26", "2026-10-27", "2026-10-28", "2026-10-29", "2026-10-30", "2026-10-31", "2026-11-01"])
    expect(w.total).toBe(75)
    expect(w.days[4]).toMatchObject({ minutes: 45, isToday: true })
  })
  it("supports Sunday-start weeks", () => {
    expect(weekSummary(new Map(), "2026-10-30", 0).days[0].date).toBe("2026-10-25")
  })
})

describe("helpers", () => {
  it("formats minutes", () => {
    expect(formatMinutes(45)).toBe("45m")
    expect(formatMinutes(60)).toBe("1h")
    expect(formatMinutes(135)).toBe("2h 15m")
  })
  it("localDay uses the given timezone", () => {
    const instant = new Date("2026-10-30T20:00:00Z")
    expect(localDay(instant, "Asia/Kolkata")).toBe("2026-10-31")
    expect(localDay(instant, "America/New_York")).toBe("2026-10-30")
    expect(localDay(instant, "Not/AZone")).toBe("2026-10-30")
  })
})
