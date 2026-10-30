"use client"

import Link from "next/link"
import { useActionState } from "react"
import { Loader2 } from "lucide-react"
import { FormField, FormMessage } from "@/components/forms/form-field"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { requestPasswordReset, signIn, signUp, updatePassword } from "@/lib/auth/actions"
import { PASSWORD_MIN, type FormState } from "@/lib/auth/schemas"

const idle: FormState = { status: "idle" }

function Submit({ pending, children }: { pending: boolean; children: string }) {
  return (
    <Button type="submit" size="lg" className="h-10 w-full" disabled={pending} aria-busy={pending}>
      {pending && <Loader2 className="animate-spin" aria-hidden="true" />}
      {children}
    </Button>
  )
}

export function LoginForm({ next, linkError }: { next?: string; linkError?: boolean }) {
  const [state, action, pending] = useActionState(signIn, idle)
  const message = state.message ?? (linkError ? "That link has expired or was already used. Log in or request a new one." : undefined)
  return (
    <form action={action} className="grid gap-4" noValidate>
      <FormMessage status={state.message ? state.status : "error"} message={message} />
      <input type="hidden" name="next" value={next ?? ""} />
      <FormField id="email" label="Email" error={state.fieldErrors?.email}>
        {(p) => <Input {...p} name="email" type="email" autoComplete="email" inputMode="email" size="lg" autoFocus defaultValue={state.values?.email} />}
      </FormField>
      <FormField
        id="password"
        label="Password"
        error={state.fieldErrors?.password}
        labelAction={
          <Link href="/forgot-password" className="text-xs font-medium text-primary hover:underline">
            Forgot password?
          </Link>
        }
      >
        {(p) => <Input {...p} name="password" type="password" autoComplete="current-password" size="lg" />}
      </FormField>
      <Submit pending={pending}>Log in</Submit>
    </form>
  )
}

export function SignupForm() {
  const [state, action, pending] = useActionState(signUp, idle)
  if (state.status === "success") return <FormMessage status="success" message={state.message} />
  return (
    <form action={action} className="grid gap-4" noValidate>
      <FormMessage status={state.status} message={state.message} />
      <FormField id="displayName" label="Name" error={state.fieldErrors?.displayName}>
        {(p) => <Input {...p} name="displayName" autoComplete="given-name" size="lg" autoFocus defaultValue={state.values?.displayName} />}
      </FormField>
      <fieldset className="grid gap-1.5">
        <legend className="mb-1.5 text-sm font-medium">Programme</legend>
        <div className="grid grid-cols-2 gap-2">
          {[
            { value: "MYP", label: "MYP", hint: "Criteria A–D" },
            { value: "DP", label: "DP", hint: "Components & %" },
          ].map((o, i) => (
            <label
              key={o.value}
              className="flex cursor-pointer items-center gap-3 rounded-lg border bg-field px-3 py-2.5 text-sm transition-colors has-[:checked]:border-primary has-[:checked]:bg-primary-soft has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring"
            >
              <input type="radio" name="programme" value={o.value} defaultChecked={(state.values?.programme ?? "MYP") === o.value} className="accent-[var(--primary)]" />
              <span>
                <span className="block font-medium">{o.label}</span>
                <span className="block text-xs text-muted-foreground">{o.hint}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      <FormField id="email" label="School or personal email" error={state.fieldErrors?.email}>
        {(p) => <Input {...p} name="email" type="email" autoComplete="email" inputMode="email" size="lg" defaultValue={state.values?.email} />}
      </FormField>
      <FormField id="password" label="Password" error={state.fieldErrors?.password} hint={`At least ${PASSWORD_MIN} characters.`}>
        {(p) => <Input {...p} name="password" type="password" autoComplete="new-password" minLength={PASSWORD_MIN} size="lg" />}
      </FormField>
      <Submit pending={pending}>Create account</Submit>
      <p className="text-center text-xs text-muted-foreground">
        By creating an account you agree to the <Link href="/terms" className="underline hover:text-foreground">Terms</Link> and{" "}
        <Link href="/privacy" className="underline hover:text-foreground">Privacy Policy</Link>.
      </p>
    </form>
  )
}

export function ForgotForm() {
  const [state, action, pending] = useActionState(requestPasswordReset, idle)
  if (state.status === "success") return <FormMessage status="success" message={state.message} />
  return (
    <form action={action} className="grid gap-4" noValidate>
      <FormMessage status={state.status} message={state.message} />
      <FormField id="email" label="Email" error={state.fieldErrors?.email}>
        {(p) => <Input {...p} name="email" type="email" autoComplete="email" inputMode="email" size="lg" autoFocus defaultValue={state.values?.email} />}
      </FormField>
      <Submit pending={pending}>Send reset link</Submit>
    </form>
  )
}

export function ResetForm() {
  const [state, action, pending] = useActionState(updatePassword, idle)
  return (
    <form action={action} className="grid gap-4" noValidate>
      <FormMessage status={state.status} message={state.message} />
      <FormField id="password" label="New password" error={state.fieldErrors?.password} hint={`At least ${PASSWORD_MIN} characters.`}>
        {(p) => <Input {...p} name="password" type="password" autoComplete="new-password" size="lg" autoFocus />}
      </FormField>
      <FormField id="confirm" label="Confirm new password" error={state.fieldErrors?.confirm}>
        {(p) => <Input {...p} name="confirm" type="password" autoComplete="new-password" size="lg" />}
      </FormField>
      <Submit pending={pending}>Update password</Submit>
    </form>
  )
}
