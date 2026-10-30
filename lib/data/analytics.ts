import { CRITERIA, type Criterion, type HistoryPoint } from "@/lib/grades"
import type { Assessment, SubjectWithGrade } from "./types"

/** A single graded result as a percentage: score/max, or the mean assessed criterion level / 8. */
export function resultPercent(a: Pick<Assessment, "raw_score" | "max_score" | "criteria">): number | null {
  if (a.raw_score != null && a.max_score != null && a.max_score > 0) return (a.raw_score / a.max_score) * 100
  const levels = Object.values((a.criteria ?? {}) as Record<string, number | null>).filter((v): v is number => v != null)
  return levels.length ? (levels.reduce((x, y) => x + y, 0) / levels.length / 8) * 100 : null
}

export function kindAverages(subjects: Pick<SubjectWithGrade, "programme" | "assessments">[]) {
  const acc = new Map<string, { sum: number; n: number }>()
  for (const s of subjects) {
    for (const a of s.assessments) {
      if (a.status !== "graded" || !a.counts) continue
      const p = resultPercent(a)
      if (p == null) continue
      const b = acc.get(a.kind) ?? { sum: 0, n: 0 }
      b.sum += p
      b.n += 1
      acc.set(a.kind, b)
    }
  }
  return [...acc.entries()]
    .map(([kind, b]) => ({ kind, average: Math.round((b.sum / b.n) * 10) / 10, count: b.n }))
    .sort((x, y) => y.count - x.count || x.kind.localeCompare(y.kind))
}

export function gradeDistribution(subjects: Pick<SubjectWithGrade, "effectiveGrade">[]) {
  return Array.from({ length: 7 }, (_, i) => ({
    grade: i + 1,
    count: subjects.filter((s) => s.effectiveGrade === i + 1).length,
  }))
}

export function criterionAverages(subjects: Pick<SubjectWithGrade, "programme" | "result">[]) {
  return CRITERIA.map((criterion: Criterion) => {
    const levels = subjects
      .filter((s) => s.programme === "MYP")
      .map((s) => s.result.criteria?.[criterion])
      .filter((v): v is number => v != null)
    return {
      criterion,
      average: levels.length ? Math.round((levels.reduce((a, b) => a + b, 0) / levels.length) * 10) / 10 : null,
      subjects: levels.length,
    }
  })
}

/** Rows keyed by date, one column per subject id holding its latest grade so far (lines never break). */
export function trendMatrix(subjects: { id: string; history: Pick<HistoryPoint, "date" | "grade">[] }[]) {
  const dates = [...new Set(subjects.flatMap((s) => s.history.map((h) => h.date)))].sort()
  return dates.map((date) => {
    const row: Record<string, string | number> = { date }
    for (const s of subjects) {
      const g = s.history.filter((h) => h.date <= date).at(-1)?.grade
      if (g != null) row[s.id] = g
    }
    return row
  })
}
