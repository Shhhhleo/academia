import type { Metadata } from "next"
import Link from "next/link"
import { AuthShell } from "@/components/auth/auth-shell"
import { ForgotForm } from "@/components/auth/auth-forms"

export const metadata: Metadata = {
  title: "Reset your password",
  robots: { index: false, follow: true },
}

export default function ForgotPasswordPage() {
  return (
    <AuthShell
      title="Reset your password"
      description="Enter the email you signed up with and we'll send you a reset link."
      footer={
        <Link href="/login" className="font-medium text-primary hover:underline">
          Back to log in
        </Link>
      }
    >
      <ForgotForm />
    </AuthShell>
  )
}
