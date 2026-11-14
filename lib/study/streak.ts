/** Date helpers work on yyyy-mm-dd strings in UTC arithmetic so they never drift with the server's timezone. */
const DAY = 86_400_000
const toMs = (iso: string) => Date.parse(`${iso}T00:00:00Z`)
const toIso = (ms: number) => new Date(ms).toISOString().slice(0, 10)
export const addDays = (iso: string, n: number) => toIso(toMs(iso) + n * DAY)

/** The calendar day it is right now in `timeZone` (falls back to UTC for an unknown zone). */
export function localDay(at: Date, timeZone: string): string {
  try {
    return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(at)
  } catch {
    return at.toISOString().slice(0, 10)
  }
}

export function dailyTotals(sessions: { studied_on: string; minutes: number }[]) {
  const totals = new Map<string, number>()
  for (const s of sessions) totals.set(s.studied_on, (totals.get(s.studied_on) ?? 0) + s.minutes)
  return totals
}

export interface StreakInfo {
  /** Consecutive goal-meeting days ending today (or yesterday, while today is still open). */
  current: number
  best: number
  todayMinutes: number
  metToday: boolean
  /** The streak is alive from yesterday but today's goal is not met yet. */
  atRisk: boolean
}

/** Snapchat-style streak: a day counts when its total reaches the daily goal. */
export function computeStreak(totals: Map<string, number>, goalMinutes: number, today: string): StreakInfo {
  const met = (d: string) => (totals.get(d) ?? 0) >= goalMinutes
  const todayMinutes = totals.get(today) ?? 0
  const metToday = met(today)

  let current = 0
  let cursor = metToday ? today : addDays(today, -1)
  while (met(cursor)) {
    current++
    cursor = addDays(cursor, -1)
  }

  const goalDays = [...totals.keys()].filter(met).sort()
  let best = 0
  let run = 0
  let prev: string | null = null
  for (const d of goalDays) {
    run = prev && addDays(prev, 1) === d ? run + 1 : 1
    best = Math.max(best, run)
    prev = d
  }

  return { current, best: Math.max(best, current), todayMinutes, metToday, atRisk: !metToday && current > 0 }
}

/** The week containing `today`, starting Monday (1) or Sunday (0). */
export function weekSummary(totals: Map<string, number>, today: string, weekStart: 0 | 1) {
  const dow = new Date(toMs(today)).getUTCDay()
  const offset = (dow - weekStart + 7) % 7
  const start = addDays(today, -offset)
  const days = Array.from({ length: 7 }, (_, i) => {
    const date = addDays(start, i)
    return { date, minutes: totals.get(date) ?? 0, isToday: date === today, isFuture: date > today }
  })
  return { start, days, total: days.reduce((s, d) => s + d.minutes, 0) }
}

export function formatMinutes(min: number) {
  const h = Math.floor(min / 60)
  const m = Math.round(min % 60)
  if (!h) return `${m}m`
  return m ? `${h}h ${m}m` : `${h}h`
}
