"use client"

import { useRouter } from "next/navigation"
import { useEffect, useId, useMemo, useRef, useState } from "react"
import { BookOpen, ClipboardList, CornerDownLeft, Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import { KIND_LABEL } from "@/lib/data/schemas"
import { ALL_NAV } from "@/lib/nav"
import { cn } from "@/lib/utils"
import { useShell } from "./shell-context"

interface Result {
  key: string
  group: "Pages" | "Subjects" | "Assessments"
  title: string
  subtitle?: string
  href: string
  color?: string
}

function score(haystack: string, q: string) {
  const h = haystack.toLowerCase()
  if (h.startsWith(q)) return 3
  if (h.split(/\s+/).some((w) => w.startsWith(q))) return 2
  return h.includes(q) ? 1 : 0
}

/** Combobox search over pages, subjects and assessments, built on the supplied Input component. */
export function GlobalSearch({ autoFocus, onNavigate }: { autoFocus?: boolean; onNavigate?: () => void }) {
  const { subjects } = useShell()
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const listId = useId()
  const [query, setQuery] = useState("")
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = e.target instanceof HTMLElement && e.target.closest("input, textarea, select, [contenteditable]")
      if ((e.key === "k" && (e.metaKey || e.ctrlKey)) || (e.key === "/" && !typing)) {
        e.preventDefault()
        inputRef.current?.focus()
        setOpen(true)
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])

  const results = useMemo<Result[]>(() => {
    const q = query.trim().toLowerCase()
    if (!q) return []
    const pages = ALL_NAV.map((n) => ({ n, s: score(`${n.label} ${n.keywords ?? ""}`, q) }))
      .filter((x) => x.s > 0)
      .sort((a, b) => b.s - a.s)
      .slice(0, 4)
      .map<Result>(({ n }) => ({ key: n.href, group: "Pages", title: n.label, href: n.href }))
    const subs = subjects
      .map((s) => ({ s, sc: score(`${s.name} ${s.subject_group ?? ""} ${s.teacher ?? ""}`, q) }))
      .filter((x) => x.sc > 0)
      .sort((a, b) => b.sc - a.sc)
      .slice(0, 5)
      .map<Result>(({ s }) => ({
        key: s.id,
        group: "Subjects",
        title: s.name,
        subtitle: s.effectiveGrade != null ? `Grade ${s.effectiveGrade} · ${s.programme} ${s.level === "MYP" ? "" : s.level}` : s.programme,
        href: `/subjects/${s.id}`,
        color: s.color,
      }))
    const tasks = subjects
      .flatMap((s) => s.assessments.map((a) => ({ a, s, sc: score(`${a.title} ${KIND_LABEL[a.kind]}`, q) })))
      .filter((x) => x.sc > 0)
      .sort((x, y) => y.sc - x.sc || (x.a.due_on < y.a.due_on ? 1 : -1))
      .slice(0, 6)
      .map<Result>(({ a, s }) => ({
        key: a.id,
        group: "Assessments",
        title: a.title,
        subtitle: `${s.name} · ${KIND_LABEL[a.kind]} · ${a.due_on}`,
        href: `/subjects/${s.id}#assessment-${a.id}`,
        color: s.color,
      }))
    return [...subs, ...tasks, ...pages]
  }, [query, subjects])

  const go = (r: Result) => {
    setOpen(false)
    setQuery("")
    ;(document.activeElement as HTMLElement | null)?.blur()
    onNavigate?.()
    router.push(r.href)
  }

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault()
      setOpen(true)
      setActive((i) => Math.min(i + 1, results.length - 1))
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      setActive((i) => Math.max(i - 1, 0))
    } else if (e.key === "Enter" && results[active]) {
      e.preventDefault()
      go(results[active])
    } else if (e.key === "Escape") {
      if (query) setQuery("")
      else inputRef.current?.blur()
      setOpen(false)
    }
  }

  const showPanel = open && query.trim().length > 0
  const activeId = results[active] ? `${listId}-${active}` : undefined
  let lastGroup = ""

  return (
    <div className="relative w-full">
      <Input
        ref={inputRef}
        type="search"
        role="combobox"
        aria-label="Search subjects, assessments and pages"
        aria-expanded={showPanel}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={showPanel ? activeId : undefined}
        autoComplete="off"
        spellCheck={false}
        autoFocus={autoFocus}
        placeholder="Search subjects and tasks…"
        leftIcon={<Search />}
        rightIcon={
          !query ? (
            <kbd className="hidden rounded border bg-muted px-1.5 font-mono text-[10px] text-muted-foreground lg:inline">Ctrl K</kbd>
          ) : undefined
        }
        clearable
        value={query}
        onChange={(e) => {
          setQuery(e.target.value)
          setActive(0)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
        onKeyDown={onKeyDown}
        className="[&::-webkit-search-cancel-button]:hidden"
      />
      {showPanel && (
        <div
          id={listId}
          role="listbox"
          aria-label="Search results"
          className="absolute top-[calc(100%+6px)] right-0 left-0 z-50 max-h-[min(70vh,420px)] overflow-y-auto rounded-xl border bg-popover p-1.5 shadow-lg"
        >
          {results.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground" role="status">
              No subjects or tasks match “{query.trim()}”.
            </p>
          ) : (
            results.map((r, i) => {
              const header = r.group !== lastGroup ? r.group : null
              lastGroup = r.group
              const Icon = r.group === "Subjects" ? BookOpen : r.group === "Assessments" ? ClipboardList : null
              const PageIcon = ALL_NAV.find((n) => n.href === r.href)?.icon
              return (
                <div key={`${r.group}-${r.key}`}>
                  {header && <p className="px-2.5 pt-2 pb-1 text-[11px] font-medium text-muted-foreground">{header}</p>}
                  <div
                    id={`${listId}-${i}`}
                    role="option"
                    aria-selected={i === active}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => go(r)}
                    onMouseMove={() => setActive(i)}
                    className={cn(
                      "flex cursor-pointer items-center gap-3 rounded-lg px-2.5 py-2 text-sm",
                      i === active && "bg-accent",
                    )}
                  >
                    {r.color ? (
                      <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: r.color }} aria-hidden="true" />
                    ) : PageIcon ? (
                      <PageIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                    ) : Icon ? (
                      <Icon className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                    ) : null}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{r.title}</span>
                      {r.subtitle && <span className="block truncate text-xs text-muted-foreground">{r.subtitle}</span>}
                    </span>
                    {i === active && <CornerDownLeft className="size-3.5 text-muted-foreground" aria-hidden="true" />}
                  </div>
                </div>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}
