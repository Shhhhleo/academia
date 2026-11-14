import { CircleCheck, Crosshair, TriangleAlert } from "lucide-react"
import { toEngineAssessment } from "@/lib/data/to-engine"
import type { SubjectWithGrade } from "@/lib/data/types"
import { requiredForTarget } from "@/lib/grades"

/** "What do I need on the next task?" for the subject's target grade. */
export function TargetCard({ subject }: { subject: SubjectWithGrade }) {
  const target = subject.target_grade
  if (target == null) {
    return <p className="text-sm text-muted-foreground">Set a target grade (Edit → Target grade) to see what you need on your next task.</p>
  }
  const engine = subject.assessments.map(toEngineAssessment)
  const nextUpcoming = subject.assessments.filter((a) => a.status === "upcoming").sort((a, b) => (a.due_on < b.due_on ? -1 : 1))[0]
  const req = requiredForTarget(engine, subject.config, target, {
    weight: nextUpcoming?.weight ?? 1,
    componentId: nextUpcoming?.component_id ?? null,
  })
  const current = subject.result.grade

  let Icon = Crosshair
  let tone = "text-foreground"
  let headline: string
  let detail: string

  if (!req.achievable) {
    Icon = TriangleAlert
    tone = "text-warning-text"
    headline = `A ${target} isn’t reachable with one more task`
    detail = "It will take several strong results. Talk to your teacher about upcoming summatives and resubmissions."
  } else if (req.required === 0 && current != null && current >= target) {
    Icon = CircleCheck
    tone = "text-success-text"
    headline = `You’re on target (${current} of ${target})`
    detail = "Keep it up. Any result on your next task keeps you at or above target."
  } else {
    const onTarget = current != null && current >= target
    if (onTarget) {
      Icon = CircleCheck
      tone = "text-success-text"
    }
    const task = nextUpcoming ? `task (“${nextUpcoming.title}”)` : "task"
    headline =
      req.unit === "level"
        ? `Aim for level ${req.required}${req.required === 8 ? "" : " or higher"} in every criterion`
        : `You need ${Math.ceil(req.required ?? 0)}% or more`
    detail = onTarget ? `On your next ${task} to stay at a ${target}. You’re on target now.` : `On your next ${task} to reach a ${target}.`
  }

  return (
    <div className="flex gap-3">
      <span className={`mt-0.5 ${tone}`}>
        <Icon className="size-5" aria-hidden="true" />
      </span>
      <div>
        <p className={`font-display text-lg font-semibold ${tone}`}>{headline}</p>
        <p className="mt-1 text-sm text-muted-foreground">{detail}</p>
      </div>
    </div>
  )
}
