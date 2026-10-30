"use client"

import { Plus } from "lucide-react"
import { useEffect } from "react"
import { AssessmentForm } from "@/components/assessments/assessment-form"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { useShell } from "./shell-context"

/** Floating "Quick Add" button (shortcut: N) and the add-assessment dialog it opens. */
export function QuickAdd() {
  const { subjects, quickAdd, openQuickAdd, closeQuickAdd } = useShell()

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = e.target instanceof HTMLElement && e.target.closest("input, textarea, select, [contenteditable], [role=dialog]")
      // Autofill and IME events can arrive without a key.
      if (typeof e.key === "string" && e.key.toLowerCase() === "n" && !e.metaKey && !e.ctrlKey && !e.altKey && !typing) {
        e.preventDefault()
        openQuickAdd()
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [openQuickAdd])

  return (
    <>
      <Tooltip>
        <TooltipTrigger
          render={
            <button
              type="button"
              onClick={() => openQuickAdd()}
              className="fixed right-5 bottom-5 z-40 grid size-14 place-items-center rounded-full bg-primary text-primary-foreground shadow-[0_10px_30px_-8px_color-mix(in_oklab,var(--primary)_70%,transparent)] transition-transform hover:scale-105 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none active:scale-95 sm:right-8 sm:bottom-8"
              aria-label="Quick add assessment"
            />
          }
        >
          <Plus className="size-6" aria-hidden="true" />
        </TooltipTrigger>
        <TooltipContent side="left">
          Add assessment <kbd className="ml-1 font-mono text-[10px] opacity-70">N</kbd>
        </TooltipContent>
      </Tooltip>

      <Dialog open={quickAdd.open} onOpenChange={(o) => (o ? openQuickAdd(quickAdd.subjectId) : closeQuickAdd())}>
        <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Add an assessment</DialogTitle>
            <DialogDescription>Log a summative, exam or other graded task. Your subject grade updates instantly.</DialogDescription>
          </DialogHeader>
          {quickAdd.open && (
            <AssessmentForm subjects={subjects} defaultSubjectId={quickAdd.subjectId} onDone={closeQuickAdd} />
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
