import "server-only"
import { redirect } from "next/navigation"
import { cache } from "react"
import { createClient } from "@/lib/supabase/server"

export interface SessionUser {
  id: string
  email: string | null
}

/** Verified identity for this request (JWT signature checked by getClaims), deduplicated per render. */
export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  const supabase = await createClient()
  const { data, error } = await supabase.auth.getClaims()
  const sub = data?.claims?.sub
  if (error || !sub) return null
  return { id: sub, email: typeof data.claims.email === "string" ? data.claims.email : null }
})

/** Use at the top of every authenticated Server Component, Server Action and route handler. */
export async function requireUser() {
  const user = await getSessionUser()
  if (!user) redirect("/login")
  const supabase = await createClient()
  return { user, supabase }
}
