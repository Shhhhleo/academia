export type Programme = "MYP" | "DP"
export type Criterion = "A" | "B" | "C" | "D"
export type Aggregation = "average" | "latest" | "highest" | "median"

export const CRITERIA: readonly Criterion[] = ["A", "B", "C", "D"]

export interface EngineAssessment {
  id: string
  /** yyyy-mm-dd */
  date: string
  status: "upcoming" | "graded"
  counts: boolean
  criteria?: Partial<Record<Criterion, number | null>> | null
  rawScore?: number | null
  maxScore?: number | null
  weight?: number | null
  componentId?: string | null
}

export interface EngineComponent {
  id: string
  name: string
  weight: number
}

/** `min` is a percentage for DP and a criteria total (/32) for MYP. */
export interface Boundary {
  grade: number
  min: number
}

export interface SubjectConfig {
  programme: Programme
  aggregation: Aggregation
  components: EngineComponent[]
  boundaries: Boundary[]
}

export interface GradeResult {
  grade: number | null
  percentage: number | null
  criteria: Record<Criterion, number | null> | null
  criteriaTotal: number | null
  partial: boolean
  criteriaUsed: number
  basedOn: number
}

export interface HistoryPoint {
  date: string
  grade: number
  percentage: number | null
  assessmentId: string
}
