import type { Assessment } from "@/lib/data/types"

export { CRITERIA } from "@/lib/grades"

export function toEngineAssessmentPct(a: Assessment): number | null {
  if (a.raw_score == null || a.max_score == null || !(a.max_score > 0)) return null
  return (a.raw_score / a.max_score) * 100
}
