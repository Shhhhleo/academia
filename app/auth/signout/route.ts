import { NextResponse, type NextRequest } from "next/server"
import { createClient } from "@/lib/supabase/server"

/** Clears a session whose account no longer exists (e.g. deleted in another tab) and returns to log in. */
export async function GET(request: NextRequest) {
  const supabase = await createClient()
  await supabase.auth.signOut({ scope: "local" })
  return NextResponse.redirect(new URL("/login", request.url))
}
