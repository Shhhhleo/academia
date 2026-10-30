"use client"

import { createContext, useContext, useState, type ReactNode } from "react"
import type { AcademicYear, Notification, Profile, SubjectWithGrade } from "@/lib/data/types"

export interface ShellData {
  profile: Profile
  email: string | null
  years: AcademicYear[]
  yearId: string
  subjects: SubjectWithGrade[]
  notifications: Notification[]
}

interface ShellContextValue extends ShellData {
  quickAdd: { open: boolean; subjectId?: string }
  openQuickAdd: (subjectId?: string) => void
  closeQuickAdd: () => void
}

const ShellContext = createContext<ShellContextValue | null>(null)

export function ShellProvider({ data, children }: { data: ShellData; children: ReactNode }) {
  const [quickAdd, setQuickAdd] = useState<{ open: boolean; subjectId?: string }>({ open: false })
  return (
    <ShellContext
      value={{
        ...data,
        quickAdd,
        openQuickAdd: (subjectId) => setQuickAdd({ open: true, subjectId }),
        closeQuickAdd: () => setQuickAdd((q) => ({ ...q, open: false })),
      }}
    >
      {children}
    </ShellContext>
  )
}

export function useShell() {
  const ctx = useContext(ShellContext)
  if (!ctx) throw new Error("useShell must be used inside <ShellProvider>")
  return ctx
}
