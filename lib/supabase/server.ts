import "server-only"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import type { Database } from "./database.types"
import { supabaseEnv } from "./env"

/** Server client carrying the signed-in user's JWT, so every query is subject to RLS. */
export async function createClient() {
  const cookieStore = await cookies()
  const { url, key } = supabaseEnv()

  return createServerClient<Database>(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) cookieStore.set(name, value, options)
        } catch {
          // Called from a Server Component: cookies are read-only there. The proxy refreshes the session instead.
        }
      },
    },
  })
}

export type ServerClient = Awaited<ReturnType<typeof createClient>>
