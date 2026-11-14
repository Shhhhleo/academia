import type { ReactNode } from "react"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

/** Label + control + hint/error, wired with aria-describedby. Pass the control as a render function. */
export function FormField({
  id,
  label,
  error,
  hint,
  required,
  className,
  labelAction,
  children,
}: {
  id: string
  label: string
  error?: string
  hint?: string
  required?: boolean
  className?: string
  labelAction?: ReactNode
  children: (props: { id: string; "aria-invalid"?: true; "aria-describedby"?: string; required?: boolean }) => ReactNode
}) {
  const describedBy = [error && `${id}-error`, hint && `${id}-hint`].filter(Boolean).join(" ") || undefined
  return (
    <div className={cn("grid gap-1.5", className)}>
      <div className="flex items-center justify-between gap-2">
        <Label htmlFor={id}>
          {label}
          {required && <span aria-hidden="true" className="text-muted-foreground">*</span>}
        </Label>
        {labelAction}
      </div>
      {children({ id, "aria-invalid": error ? true : undefined, "aria-describedby": describedBy, required })}
      {hint && !error && (
        <p id={`${id}-hint`} className="text-xs text-muted-foreground">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="text-xs font-medium text-destructive">
          {error}
        </p>
      )}
    </div>
  )
}

export function FormMessage({ status, message }: { status: "idle" | "error" | "success"; message?: string }) {
  if (!message) return null
  return (
    <div
      role={status === "error" ? "alert" : "status"}
      className={cn(
        "rounded-lg border px-3 py-2.5 text-sm",
        status === "error"
          ? "border-destructive/30 bg-destructive/5 text-destructive"
          : "border-success/30 bg-success/5 text-success-text",
      )}
    >
      {message}
    </div>
  )
}
