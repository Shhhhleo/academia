import { z } from "zod"

export const ASSESSMENT_KINDS = ["summative", "exam", "mock", "ia", "formative", "other"] as const
export const KIND_LABEL: Record<(typeof ASSESSMENT_KINDS)[number], string> = {
  summative: "Summative",
  exam: "Exam",
  mock: "Mock exam",
  ia: "Internal assessment",
  formative: "Formative",
  other: "Other",
}
export const AGGREGATIONS = ["average", "latest", "highest", "median"] as const
export const AGGREGATION_LABEL: Record<(typeof AGGREGATIONS)[number], string> = {
  average: "Average of all tasks",
  latest: "Most recent level",
  highest: "Highest level",
  median: "Median level",
}
export const EVENT_KINDS = ["deadline", "exam", "event", "study"] as const

const level = z.number().int().min(0).max(8).nullable()
const uuid = z.uuid()
const isoDate = z.iso.date("Enter a valid date.")
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullish()
    .transform((v) => (v ? v : null))

export const assessmentInput = z
  .object({
    id: uuid.optional(),
    subjectId: uuid,
    componentId: uuid.nullish(),
    title: z.string().trim().min(1, "Give the task a name.").max(160),
    kind: z.enum(ASSESSMENT_KINDS),
    status: z.enum(["upcoming", "graded"]),
    dueOn: isoDate,
    counts: z.boolean().default(true),
    rawScore: z.number().min(0, "Scores can't be negative.").nullish(),
    maxScore: z.number().positive("The maximum must be above 0.").nullish(),
    weight: z.number().positive().max(100).default(1),
    criteria: z.object({ A: level, B: level, C: level, D: level }).partial().default({}),
    notes: optionalText(2000),
  })
  .superRefine((v, ctx) => {
    if (v.rawScore != null && v.maxScore == null) {
      ctx.addIssue({ code: "custom", path: ["maxScore"], message: "Add the maximum score." })
    }
    if (v.rawScore != null && v.maxScore != null && v.rawScore > v.maxScore) {
      ctx.addIssue({ code: "custom", path: ["rawScore"], message: "The score can't be more than the maximum." })
    }
    const hasCriteria = Object.values(v.criteria).some((x) => x != null)
    if (v.status === "graded" && !hasCriteria && v.rawScore == null) {
      ctx.addIssue({
        code: "custom",
        path: ["criteria"],
        message: "Add at least one criterion level or a score, or mark the task as upcoming.",
      })
    }
  })
export type AssessmentInput = z.input<typeof assessmentInput>

const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/, "Pick a colour.")
const grade = z.number().int().min(1).max(7)

export const subjectInput = z.object({
  id: uuid.optional(),
  name: z.string().trim().min(1, "Name the subject.").max(80),
  programme: z.enum(["MYP", "DP"]),
  level: z.enum(["SL", "HL", "MYP"]),
  color: hex,
  subjectGroup: optionalText(80),
  teacher: optionalText(80),
  targetGrade: grade.nullish(),
  reportedGrade: grade.nullish(),
  aggregation: z.enum(AGGREGATIONS).default("average"),
  managebacMatch: optionalText(120),
})
export type SubjectInput = z.input<typeof subjectInput>

export const componentsInput = z.object({
  subjectId: uuid,
  components: z
    .array(z.object({ id: uuid.optional(), name: z.string().trim().min(1).max(60), weight: z.number().positive().max(100) }))
    .max(12),
})

export const boundariesInput = z.object({
  subjectId: uuid,
  boundaries: z
    .array(z.object({ grade: grade, min: z.number().min(0).max(100) }))
    .length(7)
    .nullable(),
})

export const goalInput = z.object({
  id: uuid.optional(),
  subjectId: uuid.nullish(),
  title: z.string().trim().min(1, "Describe the goal.").max(120),
  metric: z.enum(["subject_grade", "total_points", "custom"]),
  targetValue: z.number().positive().max(100),
  currentValue: z.number().min(0).max(100).nullish(),
  deadline: isoDate.nullish(),
})
export type GoalInput = z.input<typeof goalInput>

export const eventInput = z
  .object({
    id: uuid.optional(),
    subjectId: uuid.nullish(),
    title: z.string().trim().min(1, "Name the event.").max(200),
    description: optionalText(4000),
    kind: z.enum(EVENT_KINDS),
    allDay: z.boolean(),
    startsOn: isoDate.nullish(),
    startsAt: z.iso.datetime({ offset: true }).nullish(),
    endsAt: z.iso.datetime({ offset: true }).nullish(),
  })
  .superRefine((v, ctx) => {
    if (v.allDay && !v.startsOn) ctx.addIssue({ code: "custom", path: ["startsOn"], message: "Pick a date." })
    if (!v.allDay && !v.startsAt) ctx.addIssue({ code: "custom", path: ["startsAt"], message: "Pick a start time." })
    if (v.startsAt && v.endsAt && v.endsAt < v.startsAt) {
      ctx.addIssue({ code: "custom", path: ["endsAt"], message: "The end must be after the start." })
    }
  })
export type EventInput = z.input<typeof eventInput>

export const profileInput = z.object({
  displayName: z.string().trim().min(1).max(80),
  programme: z.enum(["MYP", "DP"]),
  yearLevel: z.number().int().min(1).max(13).nullish(),
  schoolName: optionalText(120),
  accent: z.enum(["indigo", "emerald", "amber", "rose", "sky", "slate"]),
  density: z.enum(["comfortable", "compact"]),
  defaultAggregation: z.enum(AGGREGATIONS),
  weekStart: z.union([z.literal(0), z.literal(1)]),
  corePoints: z.number().int().min(0).max(3).nullish(),
})
export type ProfileInput = z.input<typeof profileInput>

export type ActionResult<T = { id?: string }> =
  | ({ ok: true } & T)
  | { ok: false; error: string; fieldErrors?: Record<string, string> }

export function toFieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {}
  for (const issue of error.issues) {
    const key = issue.path.map(String).join(".") || "form"
    out[key] ??= issue.message
  }
  return out
}

// ─────────────────────────── Study, to-dos, reminders ───────────────────────────

const validTimeZone = (tz: string) => {
  try {
    new Intl.DateTimeFormat("en", { timeZone: tz })
    return true
  } catch {
    return false
  }
}

export const studySessionInput = z.object({
  subjectId: uuid.nullish(),
  studiedOn: isoDate,
  minutes: z.number().int("Use whole minutes.").min(1, "Log at least 1 minute.").max(1440, "That’s more than a day."),
  startedAt: z.iso.datetime({ offset: true }).nullish(),
  note: optionalText(500),
})
export type StudySessionInput = z.input<typeof studySessionInput>

export const studyGoalInput = z.object({
  daily: z.number().int().min(5).max(720),
  weekly: z.number().int().min(0).max(5040),
})

export const todoInput = z.object({
  id: uuid.optional(),
  title: z.string().trim().min(1, "Write the task.").max(200),
  notes: optionalText(2000),
  dueOn: isoDate.nullish(),
  subjectId: uuid.nullish(),
  priority: z.number().int().min(0).max(2).default(1),
})
export type TodoInput = z.input<typeof todoInput>

export const reminderInput = z.object({
  id: uuid.optional(),
  title: z.string().trim().min(1, "What should we remind you about?").max(200),
  notes: optionalText(1000),
  remindAt: z.iso.datetime({ offset: true, message: "Pick a date and time." }),
  subjectId: uuid.nullish(),
})
export type ReminderInput = z.input<typeof reminderInput>

export const briefInput = z.object({
  enabled: z.boolean(),
  time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use a time like 07:30."),
  days: z.number().int().min(1).max(14),
  timezone: z.string().min(1).max(64).refine(validTimeZone, "Unknown time zone."),
})
