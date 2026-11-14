import type { Assessment } from "@/lib/data/types"
import { CRITERIA, type Criterion } from "@/lib/grades"

/** Compact result label for lists: "A6 B5 C7 D–" (MYP) or "30/40 · 75%" (DP). */
export function resultTextServer(a: Assessment, programme: "MYP" | "DP") {
  if (a.status === "upcoming") return "Upcoming"
  if (programme === "MYP") {
    const c = (a.criteria ?? {}) as Partial<Record<Criterion, number | null>>
    return CRITERIA.filter((k) => c[k] != null).map((k) => `${k}${c[k]}`).join(" ") || "–"
  }
  if (a.raw_score == null || a.max_score == null) return "–"
  return `${a.raw_score}/${a.max_score} · ${Math.round((a.raw_score / a.max_score) * 100)}%`
}
