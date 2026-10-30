import type { Metadata } from "next"
import Link from "next/link"
import { AuthShell } from "@/components/auth/auth-shell"
import { LoginForm } from "@/components/auth/auth-forms"
import { safeNextPath } from "@/lib/auth/safe-next"

export const metadata: Metadata = {
  title: "Log in",
  description: "Log in to Academia to see your IB grades, targets and upcoming deadlines.",
  alternates: { canonical: "/login" },
}

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const sp = await searchParams
  const next = typeof sp.next === "string" ? safeNextPath(sp.next) : undefined
  return (
    <AuthShell
      title="Welcome back"
      description="Log in to see where you stand in every subject."
      footer={
        <>
          New to Academia?{" "}
          <Link href="/signup" className="font-medium text-primary hover:underline">
            Create a free account
          </Link>
        </>
      }
    >
      <LoginForm next={next} linkError={sp.error === "link"} />
    </AuthShell>
  )
}
