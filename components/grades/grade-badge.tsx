import { BadgeCheck, Sparkles } from "lucide-react"
import { cn } from "@/lib/utils"

/** Big mono grade numeral with "/7". */
export function GradeNumber({
  grade,
  size = "md",
  className,
}: {
  grade: number | null
  size?: "sm" | "md" | "lg" | "xl"
  className?: string
}) {
  const sizes = { sm: "text-xl", md: "text-3xl", lg: "text-5xl", xl: "text-7xl" }
  return (
    <span className={cn("inline-flex items-baseline gap-0.5 font-mono font-semibold tabular tracking-tight", className)}>
      {grade != null ? (
        <span className={sizes[size]}>{grade}</span>
      ) : (
        <span className={cn(sizes[size], "font-sans font-normal text-muted-foreground/60")} aria-label="No grade yet">
          –
        </span>
      )}
      <span className="text-sm font-medium text-muted-foreground">/7</span>
    </span>
  )
}

/** Distinguishes Academia's estimate from the school-reported grade (icon + text, never colour alone). */
export function SourceBadge({
  source,
  partial,
  className,
}: {
  source: "estimated" | "reported" | null
  partial?: boolean
  className?: string
}) {
  if (!source) return null
  const reported = source === "reported"
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium",
        reported
          ? "bg-foreground text-background"
          : "border border-dashed border-lavender bg-primary-soft text-primary",
        className,
      )}
      title={
        reported
          ? "Grade reported by your school"
          : partial
            ? "Estimated by Academia from the criteria assessed so far"
            : "Estimated by Academia from your entered results"
      }
    >
      {reported ? <BadgeCheck className="size-3" aria-hidden="true" /> : <Sparkles className="size-3" aria-hidden="true" />}
      {reported ? "Reported" : partial ? "Estimated · partial" : "Estimated"}
    </span>
  )
}

/** Tone for a grade relative to its target: on/above target, one below, or further below. */
export function gradeTone(grade: number | null, target: number | null) {
  if (grade == null || target == null) return "neutral" as const
  if (grade >= target) return "success" as const
  if (grade === target - 1) return "warning" as const
  return "decline" as const
}
