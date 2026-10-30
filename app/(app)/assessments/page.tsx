import type { Metadata } from "next"
import { Suspense } from "react"
import { PageHeader } from "@/components/app/page-header"
import { AssessmentsView } from "@/components/assessments/assessments-view"
import { AddAssessmentButton } from "@/components/subjects/subject-actions"

export const metadata: Metadata = { title: "Assessments" }

export default function AssessmentsPage() {
  return (
    <>
      <PageHeader
        title="Assessments"
        description="Every summative, exam and task across your subjects. Search, filter by subject or type, and sort any column."
        actions={<AddAssessmentButton />}
      />
      <Suspense>
        <AssessmentsView />
      </Suspense>
    </>
  )
}
