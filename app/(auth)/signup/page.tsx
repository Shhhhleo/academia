import type { Metadata } from "next"
import Link from "next/link"
import { AuthShell } from "@/components/auth/auth-shell"
import { SignupForm } from "@/components/auth/auth-forms"

export const metadata: Metadata = {
  title: "Create your free account",
  description: "Start tracking your IB MYP or DP grades in minutes. Free, private and built for IB students.",
  alternates: { canonical: "/signup" },
}

export default function SignupPage() {
  return (
    <AuthShell
      title="Create your account"
      description="Free for IB students. Your grades stay private to you."
      footer={
        <>
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-primary hover:underline">
            Log in
          </Link>
        </>
      }
    >
      <SignupForm />
    </AuthShell>
  )
}
