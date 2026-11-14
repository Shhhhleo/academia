"use client"

import { useState, useTransition, type ReactElement } from "react"
import { Loader2, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { useShell } from "@/components/app/shell-context"
import { FormField, FormMessage } from "@/components/forms/form-field"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { NativeSelect } from "@/components/ui/native-select"
import { deleteGoal, saveGoal } from "@/lib/data/actions"
import type { Goal } from "@/lib/data/types"

type Metric = "subject_grade" | "total_points" | "custom"

export function GoalDialog({ goal, trigger }: { goal?: Goal; trigger: ReactElement }) {
  const [open, setOpen] = useState(false)
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger} />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{goal ? "Edit goal" : "New goal"}</DialogTitle>
          <DialogDescription>Goals update automatically as your grades change.</DialogDescription>
        </DialogHeader>
        {open && <GoalForm goal={goal} onDone={() => setOpen(false)} />}
      </DialogContent>
    </Dialog>
  )
}

function GoalForm({ goal, onDone }: { goal?: Goal; onDone: () => void }) {
  const { subjects, profile } = useShell()
  const [metric, setMetric] = useState<Metric>(goal?.metric ?? "subject_grade")
  const [subjectId, setSubjectId] = useState(goal?.subject_id ?? subjects[0]?.id ?? "")
  const [target, setTarget] = useState(goal?.target_value?.toString() ?? "7")
  const [current, setCurrent] = useState(goal?.current_value?.toString() ?? "")
  const [deadline, setDeadline] = useState(goal?.deadline ?? "")
  const [title, setTitle] = useState(goal?.title ?? "")
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState<string>()
  const [pending, start] = useTransition()

  const subjectName = subjects.find((s) => s.id === subjectId)?.name
  const suggested =
    metric === "subject_grade"
      ? `${target || "7"} in ${subjectName ?? "a subject"}`
      : metric === "total_points"
        ? `${target || (profile.programme === "DP" ? "38" : "48")} points overall`
        : "My goal"

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    start(async () => {
      const r = await saveGoal({
        id: goal?.id,
        metric,
        subjectId: metric === "subject_grade" ? subjectId : null,
        title: title.trim() || suggested,
        targetValue: Number(target),
        currentValue: metric === "custom" && current ? Number(current) : null,
        deadline: deadline || null,
      })
      if (!r.ok) {
        setErrors(r.fieldErrors ?? {})
        setFormError(r.error)
        return
      }
      toast.success(goal ? "Goal updated" : "Goal added")
      onDone()
    })
  }

  return (
    <form onSubmit={submit} className="grid gap-4" noValidate>
      <FormMessage status="error" message={formError} />
      <FormField id="g-metric" label="Track">
        {(p) => (
          <NativeSelect {...p} value={metric} onChange={(e) => setMetric(e.target.value as Metric)}>
            <option value="subject_grade">A grade in one subject</option>
            <option value="total_points">My total points</option>
            <option value="custom">Something else (I’ll update it)</option>
          </NativeSelect>
        )}
      </FormField>
      {metric === "subject_grade" && (
        <FormField id="g-subject" label="Subject" error={errors.subjectId}>
          {(p) => (
            <NativeSelect {...p} value={subjectId} onChange={(e) => setSubjectId(e.target.value)}>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </NativeSelect>
          )}
        </FormField>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField id="g-target" label={metric === "subject_grade" ? "Target grade" : "Target"} error={errors.targetValue}>
          {(p) =>
            metric === "subject_grade" ? (
              <NativeSelect {...p} value={target} onChange={(e) => setTarget(e.target.value)} className="font-mono">
                {[7, 6, 5, 4, 3, 2, 1].map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </NativeSelect>
            ) : (
              <Input {...p} type="number" min={1} max={100} value={target} onChange={(e) => setTarget(e.target.value)} className="font-mono" />
            )
          }
        </FormField>
        <FormField id="g-deadline" label="By (optional)" error={errors.deadline}>
          {(p) => <Input {...p} type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />}
        </FormField>
      </div>
      {metric === "custom" && (
        <FormField id="g-current" label="Where you are now" hint="Update this as you make progress.">
          {(p) => <Input {...p} type="number" min={0} max={100} value={current} onChange={(e) => setCurrent(e.target.value)} className="font-mono" />}
        </FormField>
      )}
      <FormField id="g-title" label="Name" hint={`Leave blank to use “${suggested}”.`} error={errors.title}>
        {(p) => <Input {...p} value={title} onChange={(e) => setTitle(e.target.value)} placeholder={suggested} maxLength={120} />}
      </FormField>
      <div className="flex items-center justify-between gap-2 border-t pt-4">
        {goal ? (
          <Button
            type="button"
            variant="destructive"
            disabled={pending}
            onClick={() =>
              start(async () => {
                const r = await deleteGoal(goal.id)
                if (!r.ok) return void toast.error(r.error)
                toast.success("Goal deleted")
                onDone()
              })
            }
          >
            <Trash2 aria-hidden="true" /> Delete
          </Button>
        ) : (
          <span />
        )}
        <Button type="submit" size="lg" className="px-4" disabled={pending}>
          {pending && <Loader2 className="animate-spin" aria-hidden="true" />}
          {goal ? "Save goal" : "Add goal"}
        </Button>
      </div>
    </form>
  )
}
