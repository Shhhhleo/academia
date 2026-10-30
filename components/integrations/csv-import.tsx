"use client"

import { useState, useTransition } from "react"
import { FileUp, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { Panel } from "@/components/app/page-header"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { importGradesCsv } from "@/lib/managebac/actions"

const TEMPLATE = "subject,title,date,kind,score,max,A,B,C,D\nSciences,Unit 4 lab report,2026-11-12,summative,,,6,7,6,5\nPhysics,Paper 1 mock,2026-11-20,mock,31,40,,,,"

/** Manual fallback: paste or upload a CSV of graded results, preview, then import. */
export function CsvImport() {
  const [text, setText] = useState("")
  const [preview, setPreview] = useState<{ added: number; errors: string[] } | null>(null)
  const [pending, start] = useTransition()

  const run = (dryRun: boolean) =>
    start(async () => {
      const r = await importGradesCsv(text, dryRun)
      if (!r.ok) {
        toast.error(r.error)
        return
      }
      if (dryRun) setPreview({ added: r.added, errors: r.errors })
      else {
        toast.success(`Imported ${r.added} assessment${r.added === 1 ? "" : "s"}`)
        setText("")
        setPreview(null)
      }
    })

  return (
    <Panel title="Manual import (CSV)" description="No ManageBac link? Paste results from a spreadsheet. Subject names must match yours exactly.">
      <div className="grid gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <label className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-lg border bg-background px-3 text-sm font-medium hover:bg-accent has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring">
            <FileUp className="size-4" aria-hidden="true" /> Choose .csv file
            <input
              type="file"
              accept=".csv,text/csv"
              className="sr-only"
              onChange={async (e) => {
                const f = e.target.files?.[0]
                if (!f) return
                if (f.size > 512_000) return void toast.error("That file is too large (max 500 KB).")
                setText(await f.text())
                setPreview(null)
              }}
            />
          </label>
          <button type="button" onClick={() => setText(TEMPLATE)} className="text-sm font-medium text-primary hover:underline">
            Insert example
          </button>
        </div>
        <label htmlFor="csv-text" className="sr-only">
          CSV content
        </label>
        <Textarea
          id="csv-text"
          value={text}
          onChange={(e) => {
            setText(e.target.value)
            setPreview(null)
          }}
          rows={6}
          spellCheck={false}
          placeholder="subject,title,date,kind,score,max,A,B,C,D"
          className="font-mono text-xs"
        />
        {preview && (
          <div role="status" className="rounded-lg border bg-muted/50 p-3 text-sm">
            <p className="font-medium">
              Ready to import <span className="font-mono tabular">{preview.added}</span> row{preview.added === 1 ? "" : "s"}.
            </p>
            {preview.errors.length > 0 && (
              <ul className="mt-2 list-disc space-y-0.5 pl-5 text-xs text-warning-text">
                {preview.errors.slice(0, 8).map((e) => (
                  <li key={e}>{e}</li>
                ))}
                {preview.errors.length > 8 && <li>…and {preview.errors.length - 8} more</li>}
              </ul>
            )}
          </div>
        )}
        <div className="flex gap-2">
          <Button variant="outline" disabled={pending || !text.trim()} onClick={() => run(true)}>
            Preview
          </Button>
          <Button disabled={pending || !preview || preview.added === 0} onClick={() => run(false)}>
            {pending && <Loader2 className="animate-spin" aria-hidden="true" />} Import
          </Button>
        </div>
      </div>
    </Panel>
  )
}
