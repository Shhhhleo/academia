import type { Metadata } from "next"
import { PageHeader } from "@/components/app/page-header"
import { getWorkspace } from "@/lib/data/queries"

export const metadata: Metadata = { title: "Dashboard" }

export default async function DashboardPage() {
  const ws = await getWorkspace()
  return <PageHeader title={`Good to see you, ${ws.profile.display_name}`} description={`${ws.subjects.length} subjects in ${ws.year.label}`} />
}
