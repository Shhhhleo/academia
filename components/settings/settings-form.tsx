"use client"

import { useTheme } from "next-themes"
import { useEffect, useState, useTransition } from "react"
import { Check, Loader2, Monitor, Moon, Sun } from "lucide-react"
import { toast } from "sonner"
import { Panel } from "@/components/app/page-header"
import { FormField } from "@/components/forms/form-field"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { NativeSelect } from "@/components/ui/native-select"
import { AGGREGATION_LABEL, AGGREGATIONS } from "@/lib/data/schemas"
import { saveProfile } from "@/lib/data/settings-actions"
import type { Profile } from "@/lib/data/types"
import { cn } from "@/lib/utils"

const ACCENTS = [
  { id: "indigo", label: "Indigo", swatch: "#4f46e5" },
  { id: "sky", label: "Sky", swatch: "#0369a1" },
  { id: "emerald", label: "Emerald", swatch: "#047857" },
  { id: "amber", label: "Amber", swatch: "#b45309" },
  { id: "rose", label: "Rose", swatch: "#e11d48" },
  { id: "slate", label: "Slate", swatch: "#334155" },
] as const

type Accent = (typeof ACCENTS)[number]["id"]

function applyPrefs(accent: string, density: string) {
  const el = document.documentElement
  if (accent === "indigo") delete el.dataset.accent
  else el.dataset.accent = accent
  if (density === "compact") el.dataset.density = "compact"
  else delete el.dataset.density
}

export function SettingsForm({ profile }: { profile: Profile }) {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  const [displayName, setDisplayName] = useState(profile.display_name)
  const [programme, setProgramme] = useState(profile.programme)
  const [yearLevel, setYearLevel] = useState(profile.year_level?.toString() ?? "")
  const [school, setSchool] = useState(profile.school_name ?? "")
  const [accent, setAccent] = useState<Accent>(profile.accent as Accent)
  const [density, setDensity] = useState(profile.density as "comfortable" | "compact")
  const [aggregation, setAggregation] = useState(profile.default_aggregation)
  const [weekStart, setWeekStart] = useState<0 | 1>(profile.week_start === 0 ? 0 : 1)
  const [core, setCore] = useState(profile.core_points?.toString() ?? "")
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [pending, start] = useTransition()

  // Live preview: accent/density apply immediately, then persist on save.
  useEffect(() => applyPrefs(accent, density), [accent, density])

  const save = (e: React.FormEvent) => {
    e.preventDefault()
    start(async () => {
      const r = await saveProfile({
        displayName,
        programme,
        yearLevel: yearLevel ? Number(yearLevel) : null,
        schoolName: school || null,
        accent,
        density,
        defaultAggregation: aggregation,
        weekStart,
        corePoints: programme === "DP" && core !== "" ? Number(core) : null,
      })
      if (!r.ok) {
        setErrors(r.fieldErrors ?? {})
        toast.error(r.error)
        return
      }
      setErrors({})
      try {
        localStorage.setItem("academia:prefs", JSON.stringify({ accent, density }))
      } catch {}
      toast.success("Settings saved")
    })
  }

  return (
    <form onSubmit={save} className="space-y-4" noValidate>
      <Panel title="Profile" description="How Academia addresses you and which IB programme you’re in." className="scroll-mt-24" >
        <div id="profile" className="grid gap-4 sm:grid-cols-2">
          <FormField id="p-name" label="Name" error={errors.displayName}>
            {(p) => <Input {...p} value={displayName} onChange={(e) => setDisplayName(e.target.value)} maxLength={80} autoComplete="given-name" />}
          </FormField>
          <FormField id="p-school" label="School">
            {(p) => <Input {...p} value={school} onChange={(e) => setSchool(e.target.value)} maxLength={120} autoComplete="organization" placeholder="Optional" />}
          </FormField>
          <FormField id="p-programme" label="Programme" hint="New subjects default to this programme.">
            {(p) => (
              <NativeSelect {...p} value={programme} onChange={(e) => setProgramme(e.target.value as "MYP" | "DP")}>
                <option value="MYP">MYP (Middle Years Programme)</option>
                <option value="DP">DP (Diploma Programme)</option>
              </NativeSelect>
            )}
          </FormField>
          <FormField id="p-year" label="Year / grade">
            {(p) => (
              <NativeSelect {...p} value={yearLevel} onChange={(e) => setYearLevel(e.target.value)}>
                <option value="">Not set</option>
                {Array.from({ length: 13 }, (_, i) => i + 1).map((n) => (
                  <option key={n} value={n}>
                    Grade {n}
                  </option>
                ))}
              </NativeSelect>
            )}
          </FormField>
        </div>
      </Panel>

      <Panel title="Appearance" description="Make Academia feel like yours. Changes preview instantly.">
        <div id="appearance" className="space-y-6">
          <fieldset>
            <legend className="mb-2 text-sm font-medium">Theme</legend>
            <div className="grid grid-cols-3 gap-2 sm:max-w-md">
              {[
                { id: "light", label: "Light", icon: Sun },
                { id: "dark", label: "Dark", icon: Moon },
                { id: "system", label: "System", icon: Monitor },
              ].map((t) => (
                <label
                  key={t.id}
                  className="flex cursor-pointer flex-col items-center gap-1.5 rounded-lg border bg-field px-3 py-3 text-sm has-[:checked]:border-primary has-[:checked]:bg-primary-soft has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring"
                >
                  <input type="radio" name="theme" className="sr-only" checked={mounted && theme === t.id} onChange={() => setTheme(t.id)} />
                  <t.icon className="size-4" aria-hidden="true" />
                  {t.label}
                </label>
              ))}
            </div>
          </fieldset>
          <fieldset>
            <legend className="mb-2 text-sm font-medium">Accent colour</legend>
            <div className="flex flex-wrap gap-2">
              {ACCENTS.map((a) => (
                <label key={a.id} className="cursor-pointer" title={a.label}>
                  <input type="radio" name="accent" className="peer sr-only" checked={accent === a.id} onChange={() => setAccent(a.id)} aria-label={a.label} />
                  <span
                    className="grid size-9 place-items-center rounded-full ring-offset-2 ring-offset-card peer-checked:ring-2 peer-checked:ring-foreground peer-focus-visible:ring-2 peer-focus-visible:ring-ring"
                    style={{ backgroundColor: a.swatch }}
                  >
                    {accent === a.id && <Check className="size-4 text-white" aria-hidden="true" />}
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
          <fieldset>
            <legend className="mb-2 text-sm font-medium">Density</legend>
            <div className="inline-flex rounded-lg border bg-muted p-0.5">
              {(["comfortable", "compact"] as const).map((d) => (
                <label
                  key={d}
                  className={cn(
                    "cursor-pointer rounded-md px-3 py-1.5 text-sm font-medium capitalize text-muted-foreground has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring",
                    density === d && "bg-card text-foreground shadow-sm",
                  )}
                >
                  <input type="radio" name="density" className="sr-only" checked={density === d} onChange={() => setDensity(d)} />
                  {d}
                </label>
              ))}
            </div>
          </fieldset>
        </div>
      </Panel>

      <Panel title="Grading & calendar" description="Defaults for new subjects and how your calendar is laid out.">
        <div id="grading" className="grid gap-4 sm:grid-cols-2">
          <FormField id="p-agg" label="Combine MYP criterion levels by" hint="Default for new MYP subjects (each subject can override).">
            {(p) => (
              <NativeSelect {...p} value={aggregation} onChange={(e) => setAggregation(e.target.value as typeof aggregation)}>
                {AGGREGATIONS.map((a) => (
                  <option key={a} value={a}>
                    {AGGREGATION_LABEL[a]}
                  </option>
                ))}
              </NativeSelect>
            )}
          </FormField>
          <FormField id="p-week" label="Week starts on">
            {(p) => (
              <NativeSelect {...p} value={weekStart} onChange={(e) => setWeekStart(Number(e.target.value) as 0 | 1)}>
                <option value={1}>Monday</option>
                <option value={0}>Sunday</option>
              </NativeSelect>
            )}
          </FormField>
          {programme === "DP" && (
            <FormField id="p-core" label="TOK / EE core points (0–3)" hint="Added to your diploma total.">
              {(p) => (
                <NativeSelect {...p} value={core} onChange={(e) => setCore(e.target.value)} className="font-mono">
                  <option value="">Not set</option>
                  {[0, 1, 2, 3].map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </NativeSelect>
              )}
            </FormField>
          )}
        </div>
      </Panel>

      <div className="sticky bottom-4 z-20 flex justify-end">
        <Button type="submit" size="lg" className="h-10 px-5 shadow-lg" disabled={pending}>
          {pending && <Loader2 className="animate-spin" aria-hidden="true" />} Save settings
        </Button>
      </div>
    </form>
  )
}
