import { NextResponse, type NextRequest } from "next/server"
import { safeNextPath } from "@/lib/auth/safe-next"
import { createClient } from "@/lib/supabase/server"

/** PKCE return point for email confirmation and password-reset links. */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const code = searchParams.get("code")
  const next = safeNextPath(searchParams.get("next"))

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) return NextResponse.redirect(new URL(next, request.url))
  }

  return NextResponse.redirect(new URL("/login?error=link", request.url))
}
