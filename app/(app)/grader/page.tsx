import type { Metadata } from "next"
import { MaintenanceGate } from "@/components/app/maintenance-gate"
import { PageHeader } from "@/components/app/page-header"
import { TaskGrader } from "@/components/grader/task-grader"

export const metadata: Metadata = { title: "Task Grader" }

export default async function GraderPage({ searchParams }: PageProps<"/grader">) {
  // /grader?preview=1 skips the maintenance pop-up on the live site, so the feature can be tested there while it is closed.
  const preview = (await searchParams).preview === "1"
  return (
    <>
      <PageHeader
        title="Task Grader"
        description="Upload an assessment, worksheet, essay or any document and get it graded against the IB criteria for your subject and year, with feedback on how to reach the next band."
      />
      <MaintenanceGate feature="grader" preview={preview}>
        <TaskGrader />
      </MaintenanceGate>
    </>
  )
}
