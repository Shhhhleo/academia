import type { Metadata } from "next"
import { PageHeader } from "@/components/app/page-header"
import { TaskGrader } from "@/components/grader/task-grader"

export const metadata: Metadata = { title: "Task Grader" }

export default function GraderPage() {
  return (
    <>
      <PageHeader
        title="Task Grader"
        description="Upload an assessment, worksheet, essay or any document and get it graded against the IB criteria for your subject and year, with feedback on how to reach the next band."
      />
      <TaskGrader />
    </>
  )
}
