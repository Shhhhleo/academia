import type { Metadata } from "next"
import { AuthShell } from "@/components/auth/auth-shell"
import { ResetForm } from "@/components/auth/auth-forms"

export const metadata: Metadata = {
  title: "Choose a new password",
  robots: { index: false, follow: false },
}

export default function ResetPasswordPage() {
  return (
    <AuthShell title="Choose a new password" description="You're signed in from your reset link. Pick a new password to continue.">
      <ResetForm />
    </AuthShell>
  )
}
