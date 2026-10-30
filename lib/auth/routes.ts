/** Signed-in area. Kept in one place so the proxy, robots.txt and the sidebar agree. */
export const APP_ROUTES = [
  "/dashboard",
  "/subjects",
  "/assessments",
  "/calendar",
  "/calculator",
  "/goals",
  "/analytics",
  "/integrations",
  "/settings",
] as const

export const AUTH_ROUTES = ["/login", "/signup", "/forgot-password"] as const

export function isAppRoute(pathname: string) {
  return APP_ROUTES.some((r) => pathname === r || pathname.startsWith(`${r}/`))
}

export function isAuthRoute(pathname: string) {
  return AUTH_ROUTES.some((r) => pathname === r)
}
