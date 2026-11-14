"use client"

import { useRouter } from "next/navigation"
import { useState, useTransition, type ReactElement } from "react"
import { Check, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { useShell } from "@/components/app/shell-context"
import { FormField, FormMessage } from "@/components/forms/form-field"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { NativeSelect } from "@/components/ui/native-select"
import { nextSubjectColor, SUBJECT_COLORS } from "@/lib/colors"
import { saveSubject } from "@/lib/data/actions"
import { AGGREGATION_LABEL, AGGREGATIONS } from "@/lib/data/schemas"
import type { Subject } from "@/lib/data/types"
import { SUBJECT_GROUPS } from "@/lib/ib"
import { cn } from "@/lib/utils"

type Programme = "MYP" | "DP"

export function SubjectDialog({
  subject,
  trigger,
  defaultOpen = false,
}: {
  subject?: Subject
  trigger: ReactElement
  defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger} />
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{subject ? `Edit ${subject.name}` : "Add a subject"}</DialogTitle>
          <DialogDescription>
            {subject ? "Update the details, target and how the grade is calculated." : "Set it up once. Every assessment you log updates its grade."}
          </DialogDescription>
        </DialogHeader>
        {open && <SubjectForm subject={subject} onDone={() => setOpen(false)} />}
      </DialogContent>
    </Dialog>
  )
}

function SubjectForm({ subject, onDone }: { subject?: Subject; onDone: () => void }) {
  const { profile, subjects } = useShell()
  const router = useRouter()
  const [programme, setProgramme] = useState<Programme>(subject?.programme ?? profile.programme)
  const [name, setName] = useState(subject?.name ?? "")
  const [level, setLevel] = useState<"SL" | "HL" | "MYP">(subject?.level ?? (profile.programme === "DP" ? "HL" : "MYP"))
  const [color, setColor] = useState(subject?.color ?? nextSubjectColor(subjects.length))
  const [group, setGroup] = useState(subject?.subject_group ?? "")
  const [teacher, setTeacher] = useState(subject?.teacher ?? "")
  const [target, setTarget] = useState(subject?.target_grade?.toString() ?? "")
  const [reported, setReported] = useState(subject?.reported_grade?.toString() ?? "")
  const [aggregation, setAggregation] = useState(subject?.aggregation ?? profile.default_aggregation)
  const [match, setMatch] = useState(subject?.managebac_match ?? "")
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState<string>()
  const [pending, start] = useTransition()

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    start(async () => {
      const r = await saveSubject({
        id: subject?.id,
        name,
        programme,
        level: programme === "MYP" ? "MYP" : level === "MYP" ? "HL" : level,
        color,
        subjectGroup: group || null,
        teacher: teacher || null,
        targetGrade: target ? Number(target) : null,
        reportedGrade: reported ? Number(reported) : null,
        aggregation,
        managebacMatch: match || null,
      })
      if (!r.ok) {
        setErrors(r.fieldErrors ?? {})
        setFormError(r.error)
        return
      }
      toast.success(subject ? `Updated ${name.trim()}` : `Added ${name.trim()}`)
      onDone()
      if (!subject) router.push(`/subjects/${r.id}`)
    })
  }

  return (
    <form onSubmit={submit} className="grid gap-4" noValidate>
      <FormMessage status="error" message={formError} />

      <fieldset className="grid gap-1.5">
        <legend className="mb-1.5 text-sm font-medium">Programme</legend>
        <div className="grid h-9 grid-cols-2 rounded-ele border bg-muted p-0.5">
          {(["MYP", "DP"] as const).map((p) => (
            <label
              key={p}
              className="grid cursor-pointer place-items-center rounded-[6px] text-sm font-medium text-muted-foreground has-[:checked]:bg-card has-[:checked]:text-foreground has-[:checked]:shadow-sm has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring"
            >
              <input type="radio" name="programme" className="sr-only" checked={programme === p} onChange={() => setProgramme(p)} />
              {p === "MYP" ? "MYP · criteria A–D" : "DP · scores & weights"}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
        <FormField id="s-name" label="Subject name" error={errors.name} required>
          {(p) => <Input {...p} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Physics" maxLength={80} autoFocus />}
        </FormField>
        {programme === "DP" && (
          <FormField id="s-level" label="Level">
            {(p) => (
              <NativeSelect {...p} value={level} onChange={(e) => setLevel(e.target.value as "SL" | "HL")} className="w-24">
                <option value="HL">HL</option>
                <option value="SL">SL</option>
              </NativeSelect>
            )}
          </FormField>
        )}
      </div>

      <fieldset>
        <legend className="mb-2 text-sm font-medium">Colour</legend>
        <div className="flex flex-wrap gap-2">
          {SUBJECT_COLORS.map((c) => (
            <label key={c.light} className="relative cursor-pointer" title={c.name}>
              <input type="radio" name="color" className="peer sr-only" checked={color === c.light} onChange={() => setColor(c.light)} aria-label={c.name} />
              <span
                className="grid size-8 place-items-center rounded-full ring-offset-2 ring-offset-card peer-checked:ring-2 peer-checked:ring-foreground peer-focus-visible:ring-2 peer-focus-visible:ring-ring"
                style={{ backgroundColor: c.light }}
              >
                {color === c.light && <Check className="size-4 text-white" aria-hidden="true" />}
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField id="s-group" label="Subject group">
          {(p) => (
            <NativeSelect {...p} value={group} onChange={(e) => setGroup(e.target.value)}>
              <option value="">Not set</option>
              {SUBJECT_GROUPS[programme].map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </NativeSelect>
          )}
        </FormField>
        <FormField id="s-teacher" label="Teacher">
          {(p) => <Input {...p} value={teacher} onChange={(e) => setTeacher(e.target.value)} placeholder="Optional" maxLength={80} />}
        </FormField>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField id="s-target" label="Target grade" hint="Used for goals and the what-do-I-need calculator.">
          {(p) => (
            <NativeSelect {...p} value={target} onChange={(e) => setTarget(e.target.value)} className="font-mono">
              <option value="">No target</option>
              {[7, 6, 5, 4, 3, 2, 1].map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </NativeSelect>
          )}
        </FormField>
        <FormField id="s-reported" label="School-reported grade" hint="Your official grade, if your school has given one.">
          {(p) => (
            <NativeSelect {...p} value={reported} onChange={(e) => setReported(e.target.value)} className="font-mono">
              <option value="">Not reported yet</option>
              {[7, 6, 5, 4, 3, 2, 1].map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </NativeSelect>
          )}
        </FormField>
      </div>

      {programme === "MYP" && (
        <FormField id="s-agg" label="Combine criterion levels by" hint="How several tasks become one level per criterion.">
          {(p) => (
            <NativeSelect {...p} value={aggregation} onChange={(e) => setAggregation(e.target.value as typeof aggregation)}>
              {AGGREGATIONS.map((a) => (
                <option key={a} value={a}>
                  {AGGREGATION_LABEL[a]}
                </option>
              ))}
            </NativeSelect>
          )}
        </FormField>
      )}

      <FormField id="s-match" label="ManageBac class name" hint="Optional. Used to match synced deadlines to this subject, e.g. “Physics HL”.">
        {(p) => <Input {...p} value={match} onChange={(e) => setMatch(e.target.value)} maxLength={120} />}
      </FormField>

      <div className="flex justify-end gap-2 border-t pt-4">
        <Button type="button" variant="ghost" size="lg" onClick={onDone}>
          Cancel
        </Button>
        <Button type="submit" size="lg" disabled={pending} className={cn("px-4")}>
          {pending && <Loader2 className="animate-spin" aria-hidden="true" />}
          {subject ? "Save changes" : "Add subject"}
        </Button>
      </div>
    </form>
  )
}
