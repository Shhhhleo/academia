import type { Metadata } from "next"
import { AppShell } from "@/components/app/app-shell"
import { PrefsSync } from "@/components/app/prefs-sync"
import { ShellProvider } from "@/components/app/shell-context"
import { getSessionUser } from "@/lib/auth/session"
import { getNotifications, getWorkspace } from "@/lib/data/queries"

export const metadata: Metadata = {
  robots: { index: false, follow: false },
}

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const [ws, notifications, user] = await Promise.all([getWorkspace(), getNotifications(), getSessionUser()])

  return (
    <ShellProvider
      data={{
        profile: ws.profile,
        email: user?.email ?? null,
        years: ws.years,
        yearId: ws.year.id,
        subjects: ws.subjects,
        notifications,
      }}
    >
      <PrefsSync accent={ws.profile.accent} density={ws.profile.density} />
      <AppShell>{children}</AppShell>
    </ShellProvider>
  )
}
