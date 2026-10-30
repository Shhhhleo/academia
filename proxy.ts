import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"
import { isAppRoute, isAuthRoute } from "@/lib/auth/routes"
import type { Database } from "@/lib/supabase/database.types"
import { supabaseEnv } from "@/lib/supabase/env"

/**
 * Refreshes the Supabase session cookie on every request and performs the
 * optimistic redirect for signed-out visitors. Authorisation itself is enforced
 * by RLS in the database and by `requireUser()` on the server.
 */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request })
  const { url, key } = supabaseEnv()

  const supabase = createServerClient<Database>(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet, headers) {
        for (const { name, value } of cookiesToSet) request.cookies.set(name, value)
        response = NextResponse.next({ request })
        for (const { name, value, options } of cookiesToSet) response.cookies.set(name, value, options)
        for (const [k, v] of Object.entries(headers ?? {})) response.headers.set(k, v)
      },
    },
  })

  // Do not run code between createServerClient and getClaims: it validates and refreshes the session.
  const { data } = await supabase.auth.getClaims()
  const signedIn = Boolean(data?.claims?.sub)
  const { pathname, search } = request.nextUrl

  const redirectTo = (path: string) => {
    const target = request.nextUrl.clone()
    const [p, q] = path.split("?")
    target.pathname = p
    target.search = q ? `?${q}` : ""
    const res = NextResponse.redirect(target)
    for (const c of response.cookies.getAll()) res.cookies.set(c)
    return res
  }

  if (!signedIn && isAppRoute(pathname)) {
    return redirectTo(`/login?next=${encodeURIComponent(pathname + search)}`)
  }
  if (signedIn && isAuthRoute(pathname)) {
    return redirectTo("/dashboard")
  }

  return response
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icon.svg|media/|robots.txt|sitemap.xml|llms.txt|manifest.webmanifest|opengraph-image|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|mp4|webm|ico|txt|xml)$).*)",
  ],
}
