import type { Metadata } from "next"
import { PageHeader } from "@/components/app/page-header"
import { DataSection, YearsSection } from "@/components/settings/account-sections"
import { SettingsForm } from "@/components/settings/settings-form"
import { getWorkspace } from "@/lib/data/queries"

export const metadata: Metadata = { title: "Settings" }

export default async function SettingsPage() {
  const ws = await getWorkspace()
  return (
    <>
      <PageHeader title="Settings" description="Your profile, how Academia looks, how grades are calculated, and your data." />
      <div className="max-w-3xl space-y-4">
        <SettingsForm profile={ws.profile} />
        <YearsSection years={ws.years} />
        <DataSection />
      </div>
    </>
  )
}
