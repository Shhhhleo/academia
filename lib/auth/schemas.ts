import { z } from "zod"

export const PASSWORD_MIN = 10

const email = z.email("Enter a valid email address.").max(254).transform((v) => v.trim().toLowerCase())
const password = z
  .string()
  .min(PASSWORD_MIN, `Use at least ${PASSWORD_MIN} characters.`)
  .max(72, "Use 72 characters or fewer.")

export const loginSchema = z.object({
  email,
  password: z.string().min(1, "Enter your password."),
})

export const signupSchema = z.object({
  displayName: z.string().trim().min(1, "Tell us what to call you.").max(80),
  programme: z.enum(["MYP", "DP"]),
  email,
  password,
})

export const forgotSchema = z.object({ email })

export const resetSchema = z
  .object({ password, confirm: z.string() })
  .refine((v) => v.password === v.confirm, { path: ["confirm"], message: "Passwords don't match." })

export type FormState = {
  status: "idle" | "error" | "success"
  message?: string
  fieldErrors?: Partial<Record<string, string>>
  /** Non-secret values echoed back so React's post-action form reset keeps them. */
  values?: Partial<Record<string, string>>
}

export function fieldErrorsOf(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {}
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form")
    out[key] ??= issue.message
  }
  return out
}
