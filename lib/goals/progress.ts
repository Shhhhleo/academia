export type GoalStatus = "achieved" | "on-track" | "at-risk" | "no-data"

export interface GoalLike {
  metric: "subject_grade" | "total_points" | "custom"
  subject_id: string | null
  target_value: number
  current_value: number | null
  achieved_at: string | null
}

export interface GoalContext {
  subjects: { id: string; name: string; effectiveGrade: number | null }[]
  overview: { totalPoints: number; gradedSubjects: number }
}

export interface GoalProgress {
  current: number | null
  target: number
  ratio: number
  status: GoalStatus
}

/** Where a goal stands now. Subject goals: one grade below target counts as on track; points/custom: within 10%. */
export function goalProgress(goal: GoalLike, ctx: GoalContext): GoalProgress {
  const target = Number(goal.target_value)
  let current: number | null = null

  if (goal.metric === "subject_grade") {
    current = ctx.subjects.find((s) => s.id === goal.subject_id)?.effectiveGrade ?? null
  } else if (goal.metric === "total_points") {
    current = ctx.overview.gradedSubjects > 0 ? ctx.overview.totalPoints : null
  } else {
    current = goal.current_value != null ? Number(goal.current_value) : null
  }

  if (current == null || !(target > 0)) return { current, target, ratio: 0, status: "no-data" }

  const ratio = Math.min(Math.max(current / target, 0), 1)
  let status: GoalStatus
  if (current >= target) status = "achieved"
  else if (goal.metric === "subject_grade") status = current >= target - 1 ? "on-track" : "at-risk"
  else status = current / target >= 0.9 ? "on-track" : "at-risk"

  return { current, target, ratio, status }
}

export const GOAL_STATUS_LABEL: Record<GoalStatus, string> = {
  achieved: "Achieved",
  "on-track": "On track",
  "at-risk": "Needs attention",
  "no-data": "No data yet",
}
