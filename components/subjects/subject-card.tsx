import Link from "next/link"
import { Target } from "lucide-react"
import { GradeNumber, SourceBadge, gradeTone } from "@/components/grades/grade-badge"
import { Trend } from "@/components/grades/trend"
import { Sparkline } from "@/components/charts/sparkline"
import type { SubjectWithGrade } from "@/lib/data/types"
import { cn } from "@/lib/utils"

const toneRing = {
  success: "text-success-text",
  warning: "text-warning-text",
  decline: "text-decline-text",
  neutral: "text-muted-foreground",
}

export function SubjectCard({ subject }: { subject: SubjectWithGrade }) {
  const graded = subject.assessments.filter((a) => a.status === "graded").length
  const tone = gradeTone(subject.effectiveGrade, subject.target_grade)
  const gap = subject.effectiveGrade != null && subject.target_grade != null ? subject.effectiveGrade - subject.target_grade : null

  return (
    <Link
      href={`/subjects/${subject.id}`}
      className="group relative flex flex-col gap-4 overflow-hidden rounded-[var(--radius-card)] border bg-card p-5 shadow-card transition-[border-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:border-lavender hover:shadow-md focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
    >
      <span className="absolute inset-x-0 top-0 h-0.5" style={{ backgroundColor: subject.color }} aria-hidden="true" />
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate font-display text-base font-semibold">{subject.name}</h3>
          <p className="text-xs text-muted-foreground">
            {subject.programme}
            {subject.level !== "MYP" && ` · ${subject.level}`}
            {subject.subject_group && ` · ${subject.subject_group}`}
          </p>
        </div>
        <SourceBadge source={subject.effectiveSource} partial={subject.result.partial} />
      </div>

      <div className="flex items-end justify-between gap-3">
        <div>
          <GradeNumber grade={subject.effectiveGrade} size="lg" />
          <div className="mt-1">
            {subject.history.length > 1 ? (
              <Trend delta={subject.trend.delta} direction={subject.trend.direction} />
            ) : (
              <span className="text-xs text-muted-foreground">
                {graded === 0 ? "No graded tasks yet" : "1 graded task"}
              </span>
            )}
          </div>
        </div>
        {subject.history.length > 1 && (
          <Sparkline points={subject.history.map((h) => h.grade)} color={subject.color} label={`${subject.name} grade history`} />
        )}
      </div>

      <div className="flex items-center justify-between border-t pt-3 text-xs text-muted-foreground">
        <span>
          <span className="font-mono tabular text-foreground">{subject.assessments.length}</span> assessment
          {subject.assessments.length === 1 ? "" : "s"}
        </span>
        {subject.target_grade != null ? (
          <span className={cn("inline-flex items-center gap-1 font-medium", toneRing[tone])}>
            <Target className="size-3.5" aria-hidden="true" />
            Target <span className="font-mono tabular">{subject.target_grade}</span>
            {gap != null && gap !== 0 && <span className="font-mono tabular">({gap > 0 ? `+${gap}` : gap})</span>}
          </span>
        ) : (
          <span>No target set</span>
        )}
      </div>
    </Link>
  )
}
