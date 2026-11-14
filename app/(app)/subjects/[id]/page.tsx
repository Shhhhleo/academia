import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { ChevronLeft } from "lucide-react"
import { PageHeader, Panel } from "@/components/app/page-header"
import { AssessmentTable } from "@/components/assessments/assessment-table"
import { GradeLineChart } from "@/components/charts/grade-line-chart"
import { GradeNumber, SourceBadge } from "@/components/grades/grade-badge"
import { Trend } from "@/components/grades/trend"
import { ComponentBreakdown, CriteriaBreakdown } from "@/components/subjects/breakdowns"
import { AddAssessmentButton, EditSubjectButton } from "@/components/subjects/subject-actions"
import { SubjectSettings } from "@/components/subjects/subject-settings"
import { TargetCard } from "@/components/subjects/target-card"
import { getSubject } from "@/lib/data/queries"

export async function generateMetadata({ params }: PageProps<"/subjects/[id]">): Promise<Metadata> {
  const subject = await getSubject((await params).id)
  return { title: subject?.name ?? "Subject" }
}

export default async function SubjectPage({ params }: PageProps<"/subjects/[id]">) {
  const subject = await getSubject((await params).id)
  if (!subject) notFound()

  const titles = new Map(subject.assessments.map((a) => [a.id, a.title]))
  const points = subject.history.map((h) => ({ ...h, label: titles.get(h.assessmentId) }))
  const graded = subject.assessments.filter((a) => a.status === "graded" && a.counts).length

  return (
    <>
      <Link href="/subjects" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft className="size-4" aria-hidden="true" /> My Subjects
      </Link>
      <PageHeader
        title={
          <span className="inline-flex items-center gap-3">
            <span className="size-3 rounded-full" style={{ backgroundColor: subject.color }} aria-hidden="true" />
            {subject.name}
          </span>
        }
        description={[
          subject.programme,
          subject.level !== "MYP" ? subject.level : null,
          subject.subject_group,
          subject.teacher ? `with ${subject.teacher}` : null,
        ]
          .filter(Boolean)
          .join(" · ")}
        actions={
          <>
            <SubjectSettings subject={subject} />
            <EditSubjectButton subject={subject} />
            <AddAssessmentButton subjectId={subject.id} />
          </>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Panel title="Current grade" className="lg:col-span-1">
          <div className="flex items-end justify-between gap-4">
            <GradeNumber grade={subject.effectiveGrade} size="xl" />
            <div className="pb-2 text-right">
              <SourceBadge source={subject.effectiveSource} partial={subject.result.partial} />
              <div className="mt-2">
                {subject.history.length > 1 && <Trend delta={subject.trend.delta} direction={subject.trend.direction} />}
              </div>
            </div>
          </div>
          <dl className="mt-6 grid grid-cols-3 gap-3 border-t pt-4 text-sm">
            <div>
              <dt className="text-xs text-muted-foreground">Target</dt>
              <dd className="font-mono font-semibold tabular">{subject.target_grade ?? "–"}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Reported</dt>
              <dd className="font-mono font-semibold tabular">{subject.reported_grade ?? "–"}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Based on</dt>
              <dd className="font-mono font-semibold tabular">
                {graded} <span className="font-sans text-xs font-normal text-muted-foreground">task{graded === 1 ? "" : "s"}</span>
              </dd>
            </div>
          </dl>
          {subject.result.grade != null && subject.reported_grade != null && subject.result.grade !== subject.reported_grade && (
            <p className="mt-4 rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground">
              Your estimate ({subject.result.grade}) differs from the school-reported grade ({subject.reported_grade}). Teachers use
              best-fit judgement, so the reported grade is the official one.
            </p>
          )}
        </Panel>

        <Panel title={subject.programme === "MYP" ? "Criteria" : "Components"} className="lg:col-span-1">
          {subject.programme === "MYP" ? <CriteriaBreakdown subject={subject} /> : <ComponentBreakdown subject={subject} />}
        </Panel>

        <Panel title="Next step" className="lg:col-span-1">
          <TargetCard subject={subject} />
        </Panel>

        <Panel
          title="Grade history"
          description={
            points.length > 1
              ? points[0].grade === points[points.length - 1].grade
                ? `Holding at ${points[0].grade} across ${points.length} graded tasks.`
                : `From ${points[0].grade} to ${points[points.length - 1].grade} across ${points.length} graded tasks.`
              : "Your grade after each graded task appears here."
          }
          className="lg:col-span-3"
        >
          {points.length > 0 ? (
            <GradeLineChart points={points} color={subject.color} target={subject.target_grade} />
          ) : (
            <p className="py-10 text-center text-sm text-muted-foreground">No graded tasks yet. Add one to start your history.</p>
          )}
        </Panel>

        <Panel title="Assessments" description="Every task logged for this subject. Upcoming tasks come from you or ManageBac." className="lg:col-span-3">
          <AssessmentTable rows={subject.assessments} showSubject={false} emptyLabel="No assessments yet. Use “Add assessment” to log your first summative." />
        </Panel>
      </div>
    </>
  )
}
