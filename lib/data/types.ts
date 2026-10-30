import type { GradeResult, HistoryPoint, SubjectConfig } from "@/lib/grades"
import type { Tables } from "@/lib/supabase/database.types"

export type Profile = Tables<"profiles">
export type AcademicYear = Tables<"academic_years">
export type Subject = Tables<"subjects">
export type Component = Tables<"components">
export type Assessment = Tables<"assessments">
export type Goal = Tables<"goals">
export type CalendarEvent = Tables<"events">
export type Notification = Tables<"notifications">
export type Integration = Tables<"integrations">
export type ImportRun = Tables<"import_runs">
export type StudySession = Tables<"study_sessions">
export type Todo = Tables<"todos">
export type Reminder = Tables<"reminders">

export interface SubjectWithGrade extends Subject {
  components: Component[]
  assessments: Assessment[]
  config: SubjectConfig
  result: GradeResult
  history: HistoryPoint[]
  trend: { delta: number; direction: "up" | "down" | "flat" }
  /** Estimated grade when there is data, otherwise the school-reported grade. */
  effectiveGrade: number | null
  effectiveSource: "estimated" | "reported" | null
}

export interface Overview {
  gradedSubjects: number
  average: number | null
  totalPoints: number
  maxPoints: number
  corePoints: number | null
}

export interface Workspace {
  profile: Profile
  years: AcademicYear[]
  year: AcademicYear
  subjects: SubjectWithGrade[]
  overview: Overview
}
