import { CRITERIA, type Aggregation, type Boundary, type Criterion, type EngineAssessment, type GradeResult } from "./types"

/** Published IB MYP boundaries for the sum of criteria A–D (each /8, total /32). */
export const MYP_BOUNDARIES: Boundary[] = [
  { grade: 7, min: 28 },
  { grade: 6, min: 24 },
  { grade: 5, min: 19 },
  { grade: 4, min: 15 },
  { grade: 3, min: 10 },
  { grade: 2, min: 6 },
  { grade: 1, min: 0 },
]

const roundHalfUp = (x: number) => Math.floor(x + 0.5)

export function mypGradeFromTotal(total: number): number {
  return MYP_BOUNDARIES.find((b) => total >= b.min)?.grade ?? 1
}

/** `levels` must be in chronological order (used by "latest"). */
export function aggregate(levels: number[], method: Aggregation): number | null {
  if (levels.length === 0) return null
  switch (method) {
    case "latest":
      return levels[levels.length - 1]
    case "highest":
      return Math.max(...levels)
    case "median": {
      const sorted = [...levels].sort((a, b) => a - b)
      const mid = sorted.length / 2
      return Number.isInteger(mid) ? roundHalfUp((sorted[mid - 1] + sorted[mid]) / 2) : sorted[Math.floor(mid)]
    }
    case "average":
      return roundHalfUp(levels.reduce((s, l) => s + l, 0) / levels.length)
  }
}

export function computeMyp(list: EngineAssessment[], aggregation: Aggregation): GradeResult {
  const levels: Record<Criterion, number[]> = { A: [], B: [], C: [], D: [] }
  let basedOn = 0
  for (const a of list) {
    let used = false
    for (const c of CRITERIA) {
      const v = a.criteria?.[c]
      if (typeof v === "number" && Number.isFinite(v)) {
        levels[c].push(v)
        used = true
      }
    }
    if (used) basedOn++
  }

  const criteria = Object.fromEntries(CRITERIA.map((c) => [c, aggregate(levels[c], aggregation)])) as Record<
    Criterion,
    number | null
  >
  const present = CRITERIA.map((c) => criteria[c]).filter((v): v is number => v !== null)

  if (present.length === 0) {
    return { grade: null, percentage: null, criteria: null, criteriaTotal: null, partial: false, criteriaUsed: 0, basedOn: 0 }
  }

  const sum = present.reduce((s, v) => s + v, 0)
  const total = present.length === 4 ? sum : roundHalfUp((sum / present.length) * 4)
  return {
    grade: mypGradeFromTotal(total),
    percentage: (total / 32) * 100,
    criteria,
    criteriaTotal: total,
    partial: present.length < 4,
    criteriaUsed: present.length,
    basedOn,
  }
}
