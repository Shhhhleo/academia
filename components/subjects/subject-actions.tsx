"use client"

import { Pencil, Plus } from "lucide-react"
import { useShell } from "@/components/app/shell-context"
import { Button } from "@/components/ui/button"
import type { Subject } from "@/lib/data/types"
import { SubjectDialog } from "./subject-dialog"

export function AddAssessmentButton({ subjectId, label = "Add assessment" }: { subjectId?: string; label?: string }) {
  const { openQuickAdd } = useShell()
  return (
    <Button size="lg" className="h-9 px-3.5" onClick={() => openQuickAdd(subjectId)}>
      <Plus aria-hidden="true" /> {label}
    </Button>
  )
}

export function EditSubjectButton({ subject }: { subject: Subject }) {
  return (
    <SubjectDialog
      subject={subject}
      trigger={
        <Button variant="outline" size="lg" className="h-9 px-3">
          <Pencil aria-hidden="true" /> Edit
        </Button>
      }
    />
  )
}
