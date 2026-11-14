import type { Metadata } from "next"
import { ChartLine } from "lucide-react"
import { EmptyState } from "@/components/app/empty-state"
import { PageHeader, Panel } from "@/components/app/page-header"
import { CriteriaChart, DistributionChart, KindChart } from "@/components/analytics/breakdown-charts"
import { SubjectTrends } from "@/components/analytics/subject-trends"
import { criterionAverages, gradeDistribution, kindAverages } from "@/lib/data/analytics"
import { getWorkspace } from "@/lib/data/queries"

export const metadata: Metadata = { title: "Analytics" }

export default async function AnalyticsPage() {
  const ws = await getWorkspace()
  const { subjects } = ws
  if (subjects.every((s) => s.history.length === 0)) {
    return (
      <>
        <PageHeader title="Analytics" description="Trends, strengths and projections across all your subjects." />
        <EmptyState icon={ChartLine} title="Nothing to analyse yet" description="Log a few graded tasks and your trends, strengths and projections will appear here." />
      </>
    )
  }

  const hasMyp = subjects.some((s) => s.programme === "MYP")
  const projected = subjects
    .map((s) => ({ s, trend: s.trend.delta }))
    .filter(({ s }) => s.effectiveGrade != null)

  return (
    <>
      <PageHeader title="Analytics" description="Trends, strengths and projections across all your subjects. Every chart can be switched to a table." />
      <div className="grid gap-4 lg:grid-cols-2">
        <SubjectTrends subjects={subjects.map((s) => ({ id: s.id, name: s.name, color: s.color, history: s.history }))} />
        <KindChart rows={kindAverages(subjects)} />
        <DistributionChart rows={gradeDistribution(subjects)} />
        {hasMyp && <CriteriaChart rows={criterionAverages(subjects)} />}
        <Panel title="Projected outcomes" description="Where each subject is heading based on its latest movement. Estimates, not predictions from your school." className={hasMyp ? "" : "lg:col-span-2"}>
          <ul className="divide-y">
            {projected.map(({ s, trend }) => {
              const next = Math.min(7, Math.max(1, (s.effectiveGrade ?? 0) + Math.sign(trend)))
              return (
                <li key={s.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                  <span className="inline-flex min-w-0 items-center gap-2">
                    <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: s.color }} aria-hidden="true" />
                    <span className="truncate">{s.name}</span>
                  </span>
                  <span className="shrink-0 font-mono text-xs tabular">
                    {s.effectiveGrade} → <span className="font-semibold">{next}</span>
                    <span className="ml-2 font-sans text-muted-foreground">
                      {trend > 0 ? "rising" : trend < 0 ? "falling" : "steady"}
                    </span>
                  </span>
                </li>
              )
            })}
          </ul>
        </Panel>
      </div>
    </>
  )
}
