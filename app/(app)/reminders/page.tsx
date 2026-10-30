import type { Metadata } from "next"
import { PageHeader } from "@/components/app/page-header"
import { BriefSettings, ReminderForm, ReminderList } from "@/components/planner/reminders-board"
import { getReminders, getWorkspace } from "@/lib/data/queries"
import { localDay } from "@/lib/study/streak"

export const metadata: Metadata = { title: "Reminders" }

export default async function RemindersPage() {
  const [ws, reminders] = await Promise.all([getWorkspace(), getReminders()])
  return (
    <>
      <PageHeader title="Reminders" description="Set reminders for anything, and choose when your daily brief is ready each day." />
      <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
        <ReminderList reminders={reminders} now={new Date().getTime()} />
        <div className="space-y-4">
          <ReminderForm today={localDay(new Date(), ws.profile.timezone)} />
          <BriefSettings />
        </div>
      </div>
    </>
  )
}
