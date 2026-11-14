import Link from "next/link"
import { gradeTone } from "@/components/grades/grade-badge"
import type { SubjectWithGrade } from "@/lib/data/types"
import { cn } from "@/lib/utils"

const toneText = {
  success: "text-success-text",
  warning: "text-warning-text",
  decline: "text-decline-text",
  neutral: "text-muted-foreground",
}

/** Bullet bars: current grade (bar) against target (tick) for each subject, on the 1–7 scale. */
export function TargetBars({ subjects }: { subjects: SubjectWithGrade[] }) {
  return (
    <ul className="space-y-3.5">
      {subjects.map((s) => {
        const tone = gradeTone(s.effectiveGrade, s.target_grade)
        const gap = s.effectiveGrade != null && s.target_grade != null ? s.effectiveGrade - s.target_grade : null
        return (
          <li key={s.id}>
            <Link href={`/subjects/${s.id}`} className="group block rounded-md focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none">
              <div className="mb-1.5 flex items-center justify-between gap-3 text-sm">
                <span className="truncate font-medium group-hover:underline">{s.name}</span>
                <span className="shrink-0 font-mono text-xs tabular">
                  <span className="font-semibold">{s.effectiveGrade ?? "–"}</span>
                  <span className="text-muted-foreground"> / target {s.target_grade ?? "–"}</span>
                  {gap != null && gap !== 0 && <span className={cn("ml-1.5", toneText[tone])}>{gap > 0 ? `+${gap}` : gap}</span>}
                </span>
              </div>
              <div
                className="relative h-2 rounded-full bg-muted"
                role="img"
                aria-label={`${s.name}: grade ${s.effectiveGrade ?? "not set"}, target ${s.target_grade ?? "not set"}`}
              >
                <div className="h-full rounded-full" style={{ width: `${((s.effectiveGrade ?? 0) / 7) * 100}%`, backgroundColor: s.color }} />
                {s.target_grade != null && (
                  <span
                    className="absolute -top-1 h-4 w-0.5 rounded-full bg-foreground"
                    style={{ left: `calc(${(s.target_grade / 7) * 100}% - 1px)` }}
                    aria-hidden="true"
                  />
                )}
              </div>
            </Link>
          </li>
        )
      })}
    </ul>
  )
}
