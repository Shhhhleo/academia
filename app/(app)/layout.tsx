import type { Metadata } from "next"
import { AppShell } from "@/components/app/app-shell"
import { BriefScheduler } from "@/components/app/brief-scheduler"
import { PrefsSync } from "@/components/app/prefs-sync"
import { ShellProvider } from "@/components/app/shell-context"
import { getSessionUser } from "@/lib/auth/session"
import { getNotifications, getReminders, getWorkspace } from "@/lib/data/queries"

export const metadata: Metadata = {
  robots: { index: false, follow: false },
}

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const [ws, notifications, user, reminders] = await Promise.all([getWorkspace(), getNotifications(), getSessionUser(), getReminders()])

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
      <BriefScheduler
        enabled={ws.profile.brief_enabled}
        time={ws.profile.brief_time}
        timezone={ws.profile.timezone}
        reminders={reminders.filter((r) => !r.done_at).map((r) => ({ id: r.id, title: r.title, remind_at: r.remind_at }))}
      />
      <AppShell>{children}</AppShell>
    </ShellProvider>
  )
}
