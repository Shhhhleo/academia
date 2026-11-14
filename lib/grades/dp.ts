import type { Boundary, EngineAssessment, EngineComponent, GradeResult } from "./types"

/** Generic DP boundaries; real ones vary by subject and session, so users can edit them. */
export const DEFAULT_DP_BOUNDARIES: Boundary[] = [
  { grade: 7, min: 80 },
  { grade: 6, min: 70 },
  { grade: 5, min: 60 },
  { grade: 4, min: 50 },
  { grade: 3, min: 40 },
  { grade: 2, min: 30 },
  { grade: 1, min: 0 },
]

export function percentToGrade(pct: number, boundaries: Boundary[]): number {
  const sorted = [...boundaries].sort((a, b) => b.min - a.min)
  return sorted.find((b) => pct >= b.min)?.grade ?? 1
}

function percentOf(a: EngineAssessment): number | null {
  if (a.rawScore == null || a.maxScore == null || !(a.maxScore > 0)) return null
  return (a.rawScore / a.maxScore) * 100
}

const weightOf = (a: EngineAssessment) => (a.weight != null && a.weight > 0 ? a.weight : 1)

const UNASSIGNED = "__unassigned__"

/**
 * Weighted mean of assessment percentages. With components, each component's
 * average is weighted by the component weight and the result is normalised over
 * the components that have data. Assessments outside any component form one
 * extra bucket weighted by the unallocated share (or the mean component weight).
 */
export function computeDp(list: EngineAssessment[], components: EngineComponent[], boundaries: Boundary[]): GradeResult {
  const scored = list.map((a) => ({ a, pct: percentOf(a) })).filter((x): x is { a: EngineAssessment; pct: number } => x.pct !== null)

  if (scored.length === 0) {
    return { grade: null, percentage: null, criteria: null, criteriaTotal: null, partial: false, criteriaUsed: 0, basedOn: 0 }
  }

  let percentage: number
  if (components.length === 0) {
    const w = scored.reduce((s, x) => s + weightOf(x.a), 0)
    percentage = scored.reduce((s, x) => s + x.pct * weightOf(x.a), 0) / w
  } else {
    const known = new Map(components.map((c) => [c.id, c.weight]))
    const allocated = components.reduce((s, c) => s + c.weight, 0)
    const unassignedWeight = allocated < 100 ? 100 - allocated : allocated / components.length

    const buckets = new Map<string, { sum: number; w: number }>()
    for (const x of scored) {
      const key = x.a.componentId && known.has(x.a.componentId) ? x.a.componentId : UNASSIGNED
      const b = buckets.get(key) ?? { sum: 0, w: 0 }
      b.sum += x.pct * weightOf(x.a)
      b.w += weightOf(x.a)
      buckets.set(key, b)
    }

    let num = 0
    let den = 0
    for (const [key, b] of buckets) {
      const cw = key === UNASSIGNED ? unassignedWeight : (known.get(key) ?? 0)
      if (cw <= 0) continue
      num += (b.sum / b.w) * cw
      den += cw
    }
    percentage = den > 0 ? num / den : scored.reduce((s, x) => s + x.pct, 0) / scored.length
  }

  return {
    grade: percentToGrade(percentage, boundaries),
    percentage,
    criteria: null,
    criteriaTotal: null,
    partial: false,
    criteriaUsed: 0,
    basedOn: scored.length,
  }
}
