import {
  computeSubjectGrade,
  DEFAULT_DP_BOUNDARIES,
  gradeHistory,
  MYP_BOUNDARIES,
  trendOf,
  type Boundary,
  type Criterion,
  type EngineAssessment,
  type SubjectConfig,
} from "@/lib/grades"
import type { Assessment, Component, Overview, Profile, Subject, SubjectWithGrade } from "./types"

export function toEngineAssessment(a: Assessment): EngineAssessment {
  return {
    id: a.id,
    date: a.due_on,
    status: a.status,
    counts: a.counts,
    criteria: (a.criteria ?? null) as Partial<Record<Criterion, number | null>> | null,
    rawScore: a.raw_score,
    maxScore: a.max_score,
    weight: a.weight,
    componentId: a.component_id,
  }
}

export function parseBoundaries(value: unknown): Boundary[] | null {
  if (!Array.isArray(value)) return null
  const rows = value.filter(
    (b): b is Boundary => typeof b?.grade === "number" && typeof b?.min === "number",
  )
  return rows.length ? rows : null
}

export function subjectConfig(s: Pick<Subject, "programme" | "aggregation" | "boundaries">, components: Component[]): SubjectConfig {
  return {
    programme: s.programme,
    aggregation: s.aggregation,
    components: components.map((c) => ({ id: c.id, name: c.name, weight: Number(c.weight) })),
    boundaries: s.programme === "MYP" ? MYP_BOUNDARIES : (parseBoundaries(s.boundaries) ?? DEFAULT_DP_BOUNDARIES),
  }
}

export function withGrade(s: Subject, components: Component[], assessments: Assessment[]): SubjectWithGrade {
  const config = subjectConfig(s, components)
  const engine = assessments.map(toEngineAssessment)
  const result = computeSubjectGrade(engine, config)
  const history = gradeHistory(engine, config)
  const effectiveGrade = result.grade ?? s.reported_grade
  return {
    ...s,
    components: [...components].sort((a, b) => a.position - b.position),
    assessments: [...assessments].sort((a, b) => (a.due_on < b.due_on ? 1 : a.due_on > b.due_on ? -1 : 0)),
    config,
    result,
    history,
    trend: trendOf(history),
    effectiveGrade,
    effectiveSource: result.grade != null ? "estimated" : s.reported_grade != null ? "reported" : null,
  }
}

export function overviewOf(subjects: SubjectWithGrade[], profile: Pick<Profile, "programme" | "core_points">): Overview {
  const graded = subjects.map((s) => s.effectiveGrade).filter((g): g is number => g != null)
  const isDp = profile.programme === "DP"
  const core = isDp ? (profile.core_points ?? null) : null
  return {
    gradedSubjects: graded.length,
    average: graded.length ? graded.reduce((a, b) => a + b, 0) / graded.length : null,
    totalPoints: graded.reduce((a, b) => a + b, 0) + (core ?? 0),
    maxPoints: subjects.length * 7 + (isDp ? 3 : 0),
    corePoints: core,
  }
}
