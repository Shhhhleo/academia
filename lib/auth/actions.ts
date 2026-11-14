"use server"

import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { absoluteUrl } from "@/lib/site"
import { safeNextPath } from "./safe-next"
import { fieldErrorsOf, forgotSchema, loginSchema, resetSchema, signupSchema, type FormState } from "./schemas"

const entries = (fd: FormData) => Object.fromEntries(fd.entries()) as Record<string, string>

export async function signIn(_prev: FormState, formData: FormData): Promise<FormState> {
  const raw = entries(formData)
  const values = { email: raw.email ?? "" }
  const parsed = loginSchema.safeParse(raw)
  if (!parsed.success) return { status: "error", fieldErrors: fieldErrorsOf(parsed.error), values }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword(parsed.data)
  if (error) {
    if (error.code === "email_not_confirmed") {
      return { status: "error", message: "Confirm your email first. Check your inbox for the link we sent.", values }
    }
    // One message for every credential failure so the form never reveals which emails have accounts.
    return { status: "error", message: "That email and password don't match an account.", values }
  }
  redirect(safeNextPath(raw.next))
}

export async function signUp(_prev: FormState, formData: FormData): Promise<FormState> {
  const raw = entries(formData)
  const values = { email: raw.email ?? "", displayName: raw.displayName ?? "", programme: raw.programme ?? "MYP" }
  const parsed = signupSchema.safeParse(raw)
  if (!parsed.success) return { status: "error", fieldErrors: fieldErrorsOf(parsed.error), values }

  const { email, password, displayName, programme } = parsed.data
  const supabase = await createClient()
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: absoluteUrl("/auth/callback?next=/dashboard"),
      data: { display_name: displayName, programme },
    },
  })
  if (error) {
    if (error.code === "weak_password") return { status: "error", fieldErrors: { password: error.message }, values }
    if (error.code === "email_address_not_authorized" || error.code === "email_address_invalid") {
      return { status: "error", message: "We couldn’t send a confirmation email to that address. Check it’s correct, or try again later.", values }
    }
    if (error.code === "over_email_send_rate_limit") {
      return { status: "error", message: "Too many sign-up emails were sent recently. Try again in a few minutes.", values }
    }
    return { status: "error", message: "We couldn't create your account. Please try again.", values }
  }
  if (data.session) redirect("/dashboard")
  return {
    status: "success",
    message: `We sent a confirmation link to ${email}. Open it on this device to finish setting up Academia.`,
  }
}

export async function requestPasswordReset(_prev: FormState, formData: FormData): Promise<FormState> {
  const raw = entries(formData)
  const parsed = forgotSchema.safeParse(raw)
  if (!parsed.success) return { status: "error", fieldErrors: fieldErrorsOf(parsed.error), values: { email: raw.email ?? "" } }

  const supabase = await createClient()
  await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: absoluteUrl("/auth/callback?next=/reset-password"),
  })
  // Same response whether or not the account exists.
  return { status: "success", message: "If that email has an Academia account, a reset link is on its way." }
}

export async function updatePassword(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = resetSchema.safeParse(entries(formData))
  if (!parsed.success) return { status: "error", fieldErrors: fieldErrorsOf(parsed.error) }

  const supabase = await createClient()
  const { data: claims } = await supabase.auth.getClaims()
  if (!claims?.claims?.sub) {
    return { status: "error", message: "Your reset link has expired. Request a new one." }
  }
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password })
  if (error) {
    if (error.code === "same_password") {
      return { status: "error", fieldErrors: { password: "Choose a password you haven't used here before." } }
    }
    return { status: "error", message: "We couldn't update your password. Please try again." }
  }
  redirect("/dashboard")
}

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect("/login")
}
