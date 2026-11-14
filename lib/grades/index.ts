import { computeDp, DEFAULT_DP_BOUNDARIES, percentToGrade } from "./dp"
import { aggregate, computeMyp, MYP_BOUNDARIES, mypGradeFromTotal } from "./myp"
import type { EngineAssessment, GradeResult, HistoryPoint, SubjectConfig } from "./types"

export * from "./types"
export { aggregate, DEFAULT_DP_BOUNDARIES, MYP_BOUNDARIES, mypGradeFromTotal, percentToGrade }

const byDate = (a: EngineAssessment, b: EngineAssessment) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0)

/** Graded, counted assessments in chronological order: the only ones that affect a grade. */
export function countable(list: EngineAssessment[]): EngineAssessment[] {
  return list.filter((a) => a.status === "graded" && a.counts).sort(byDate)
}

export function computeSubjectGrade(list: EngineAssessment[], config: SubjectConfig): GradeResult {
  const rows = countable(list)
  return config.programme === "MYP"
    ? computeMyp(rows, config.aggregation)
    : computeDp(rows, config.components, config.boundaries)
}

export function gradeHistory(list: EngineAssessment[], config: SubjectConfig): HistoryPoint[] {
  const rows = countable(list)
  const points: HistoryPoint[] = []
  for (let i = 0; i < rows.length; i++) {
    const r = computeSubjectGrade(rows.slice(0, i + 1), config)
    if (r.grade !== null) {
      points.push({ date: rows[i].date, grade: r.grade, percentage: r.percentage, assessmentId: rows[i].id })
    }
  }
  return points
}

export function trendOf(history: { grade: number }[]): { delta: number; direction: "up" | "down" | "flat" } {
  if (history.length < 2) return { delta: 0, direction: "flat" }
  const delta = history[history.length - 1].grade - history[history.length - 2].grade
  return { delta, direction: delta > 0 ? "up" : delta < 0 ? "down" : "flat" }
}

const FUTURE = "9999-12-31"

/**
 * Minimum result on the next task that brings the subject to `target`.
 * DP → percent on that task (may exceed 100 when unreachable). MYP → uniform level 0–8.
 */
export function requiredForTarget(
  list: EngineAssessment[],
  config: SubjectConfig,
  target: number,
  next: { weight?: number; componentId?: string | null },
): { required: number | null; achievable: boolean; unit: "percent" | "level" } {
  const rows = countable(list)

  if (config.programme === "MYP") {
    for (let level = 0; level <= 8; level++) {
      const hypo: EngineAssessment = {
        id: "__next__",
        date: FUTURE,
        status: "graded",
        counts: true,
        criteria: { A: level, B: level, C: level, D: level },
      }
      if ((computeSubjectGrade([...rows, hypo], config).grade ?? 0) >= target) {
        return { required: level, achievable: true, unit: "level" }
      }
    }
    return { required: null, achievable: false, unit: "level" }
  }

  const gradeWith = (pct: number) =>
    computeSubjectGrade(
      [
        ...rows,
        {
          id: "__next__",
          date: FUTURE,
          status: "graded",
          counts: true,
          rawScore: pct,
          maxScore: 100,
          weight: next.weight ?? 1,
          componentId: next.componentId ?? null,
        },
      ],
      config,
    ).grade ?? 0

  if (gradeWith(0) >= target) return { required: 0, achievable: true, unit: "percent" }

  let hi = 10_000
  if (gradeWith(hi) < target) return { required: null, achievable: false, unit: "percent" }
  let lo = 0
  for (let i = 0; i < 80; i++) {
    const mid = (lo + hi) / 2
    if (gradeWith(mid) >= target) hi = mid
    else lo = mid
  }
  return { required: hi, achievable: hi <= 100, unit: "percent" }
}
