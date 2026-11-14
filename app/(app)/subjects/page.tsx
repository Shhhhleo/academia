import type { Metadata } from "next"
import { BookOpen, Plus } from "lucide-react"
import { EmptyState } from "@/components/app/empty-state"
import { PageHeader } from "@/components/app/page-header"
import { SubjectCard } from "@/components/subjects/subject-card"
import { SubjectDialog } from "@/components/subjects/subject-dialog"
import { Button } from "@/components/ui/button"
import { getWorkspace } from "@/lib/data/queries"

export const metadata: Metadata = { title: "My Subjects" }

export default async function SubjectsPage({ searchParams }: PageProps<"/subjects">) {
  const [ws, sp] = await Promise.all([getWorkspace(), searchParams])
  const addButton = (
    <Button size="lg" className="h-9 px-3.5">
      <Plus aria-hidden="true" /> Add subject
    </Button>
  )

  return (
    <>
      <PageHeader
        title="My Subjects"
        description={`${ws.subjects.length} subject${ws.subjects.length === 1 ? "" : "s"} in ${ws.year.label}. Open one to see its criteria, history and what you need next.`}
        actions={<SubjectDialog trigger={addButton} defaultOpen={sp.new === "1"} />}
      />
      {ws.subjects.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="Add your first subject"
          description="Start with the subjects you take this year. MYP subjects use criteria A–D; DP subjects use scores and component weightings."
          action={<SubjectDialog trigger={addButton} />}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {ws.subjects.map((s) => (
            <SubjectCard key={s.id} subject={s} />
          ))}
        </div>
      )}
    </>
  )
}
