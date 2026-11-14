import type { Metadata } from "next"
import { PageHeader } from "@/components/app/page-header"
import { WhatIf } from "@/components/calculator/what-if"

export const metadata: Metadata = { title: "Grade Calculator" }

export default async function CalculatorPage({ searchParams }: PageProps<"/calculator">) {
  const sp = await searchParams
  return (
    <>
      <PageHeader
        title="Grade Calculator"
        description="Try out results before you get them. See how a future summative would move your grade, and the minimum you need to hit a target."
      />
      <WhatIf initialSubjectId={typeof sp.subject === "string" ? sp.subject : undefined} />
    </>
  )
}
