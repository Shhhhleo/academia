import type { Metadata } from "next"
import { format } from "date-fns"
import { PageHeader, Panel } from "@/components/app/page-header"
import { CsvImport } from "@/components/integrations/csv-import"
import { ManageBacPanel } from "@/components/integrations/managebac-panel"
import { requireUser } from "@/lib/auth/session"

export const metadata: Metadata = { title: "ManageBac Integration" }

export default async function ManageBacPage() {
  const { supabase } = await requireUser()
  const [{ data: integration }, { data: runs }] = await Promise.all([
    supabase.from("integrations").select("status, feed_host, last_synced_at, last_error").eq("provider", "managebac").maybeSingle(),
    supabase.from("import_runs").select("*").order("started_at", { ascending: false }).limit(10),
  ])

  return (
    <>
      <PageHeader
        title="ManageBac Integration"
        description="Link your ManageBac calendar so deadlines and assessment dates flow into Academia automatically."
      />
      <ManageBacPanel
        info={{
          connected: Boolean(integration?.feed_host),
          host: integration?.feed_host ?? null,
          status: integration?.status ?? "disconnected",
          lastSyncedAt: integration?.last_synced_at ?? null,
          lastError: integration?.last_error ?? null,
        }}
      />
      <div className="mt-4 grid gap-4 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <CsvImport />
        </div>
        <Panel title="Import history" className="lg:col-span-2">
          {!runs?.length ? (
            <p className="py-6 text-center text-sm text-muted-foreground">No imports yet.</p>
          ) : (
            <table className="w-full text-sm">
              <caption className="sr-only">Recent calendar syncs and CSV imports</caption>
              <thead className="text-left text-xs text-muted-foreground">
                <tr>
                  <th scope="col" className="pb-2 font-medium">When</th>
                  <th scope="col" className="pb-2 font-medium">Source</th>
                  <th scope="col" className="pb-2 font-medium">Result</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {runs.map((r) => (
                  <tr key={r.id}>
                    <td className="py-2 font-mono text-xs tabular">{format(new Date(r.started_at), "d MMM, HH:mm")}</td>
                    <td className="py-2">{r.kind === "csv" ? "CSV" : r.kind === "google" ? "Google Calendar" : "ManageBac"}</td>
                    <td className="py-2 text-xs">
                      {r.status === "success" ? (
                        <span className="text-success-text">
                          +{r.added} new{r.updated ? ` · ${r.updated} updated` : ""}
                        </span>
                      ) : r.status === "error" ? (
                        <span className="text-warning-text">{r.error ?? "Failed"}</span>
                      ) : (
                        <span className="text-muted-foreground">Running…</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Panel>
      </div>
      <p className="mt-6 max-w-3xl text-xs text-muted-foreground">
        Why a calendar link instead of signing in to ManageBac? ManageBac doesn’t offer student sign-in for other apps. Its official API is only
        available to school administrators. The calendar subscription is the secure, student-authorised way to share your deadlines, and it never
        exposes your password.
      </p>
    </>
  )
}
