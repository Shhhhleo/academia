import Image from "next/image"
import Link from "next/link"
import { BellRing, CalendarSync, ChartLine, Gauge, KeyRound, LockKeyhole, Search, ShieldCheck, Target } from "lucide-react"
import { Logo } from "@/components/brand/logo"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { FAQ } from "@/lib/faq"

export function Statement() {
  return (
    <section id="statement" aria-labelledby="statement-h" className="mx-auto max-w-6xl scroll-mt-16 px-4 py-28 sm:px-6 sm:py-36">
      <h2 id="statement-h" className="max-w-4xl text-[clamp(2.25rem,5.2vw,4.25rem)] leading-[1.02] font-extrabold">
        Every summative changes your grade. <span className="text-muted-foreground">Now you see it happen.</span>
      </h2>
      <div className="mt-14 grid gap-10 border-t pt-10 sm:grid-cols-3">
        {[
          ["MYP, criterion by criterion", "Log A, B, C and D out of 8. Academia combines them across tasks and converts with the IB boundaries."],
          ["DP, weighted properly", "Scores, component weightings and editable grade boundaries for every subject, HL and SL."],
          ["Estimated, never mistaken", "Academia’s grades are always labelled as estimates, shown next to the grade your school reports."],
        ].map(([t, d]) => (
          <div key={t}>
            <h3 className="text-base font-semibold">{t}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{d}</p>
          </div>
        ))}
      </div>
    </section>
  )
}

const FEATURES = [
  { icon: Gauge, title: "A live 1–7 for every subject", body: "Add a result and the grade, trend and dashboard update instantly. No spreadsheet formulas.", span: "sm:col-span-2" },
  { icon: Target, title: "Goals that check themselves", body: "Set “7 in Physics” or “38 points”. Progress rings update with every grade." },
  { icon: CalendarSync, title: "ManageBac deadlines, synced", body: "Import tasks and events from your ManageBac calendar link, matched to your subjects." },
  { icon: Search, title: "Find anything, fast", body: "Search every subject and task from anywhere with Ctrl K, or press N to log a result." },
  { icon: BellRing, title: "Know when things move", body: "A notification when a grade changes or new ManageBac deadlines arrive." },
  { icon: ChartLine, title: "Analytics that explain", body: "Trends per subject, exam versus summative results, criterion strengths, all with table views.", span: "sm:col-span-2", image: "/media/screens/analytics-light.png" },
  { icon: ShieldCheck, title: "Private by design", body: "Database-level isolation between accounts, encrypted integration links, full export and delete." },
]

export function Features() {
  return (
    <section id="features" aria-labelledby="features-h" className="mx-auto max-w-6xl scroll-mt-16 px-4 py-24 sm:px-6">
      <h2 id="features-h" className="max-w-2xl text-3xl font-bold sm:text-4xl">Built around how IB grades actually work</h2>
      <p className="mt-3 max-w-xl text-muted-foreground">Everything in one calm place, customisable down to the accent colour.</p>
      <div className="mt-12 grid gap-4 sm:grid-cols-3">
        {FEATURES.map((f) => (
          <article key={f.title} className={`group relative overflow-hidden rounded-[var(--radius-card)] border bg-card p-6 shadow-card transition-colors hover:border-lavender ${f.span ?? ""}`}>
            <span className="grid size-10 place-items-center rounded-lg bg-primary-soft text-primary">
              <f.icon className="size-5" aria-hidden="true" />
            </span>
            <h3 className="mt-4 text-lg font-semibold">{f.title}</h3>
            <p className="mt-1.5 max-w-md text-sm leading-relaxed text-muted-foreground">{f.body}</p>
            {f.image && (
              <div className="mt-5 -mb-6 overflow-hidden rounded-t-lg border border-b-0">
                <Image src={f.image} alt="Academia analytics page with subject trend lines and assessment type comparison" width={2880} height={1800} sizes="(min-width: 640px) 66vw, 100vw" className="h-56 w-full object-cover object-top transition-transform duration-500 group-hover:scale-[1.02]" />
              </div>
            )}
          </article>
        ))}
      </div>
    </section>
  )
}

export function ManageBacSection() {
  const items = [
    { t: "Unit 3: Comparative essay", s: "Language and Literature", d: "Fri 6 Nov", c: "#2a78d6" },
    { t: "Geometry & trigonometry test", s: "Mathematics", d: "Tue 10 Nov", c: "#e87ba4" },
    { t: "Research project proposal", s: "Individuals and Societies", d: "Thu 12 Nov", c: "#1baf7a" },
    { t: "Grade 10 Parent Conferences", s: "School event", d: "Fri 20 Nov", c: "#a1a1aa" },
  ]
  return (
    <section id="managebac" aria-labelledby="mb-h" className="scroll-mt-16 border-y bg-surface-2/60">
      <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-24 sm:px-6 lg:grid-cols-2">
        <div>
          <h2 id="mb-h" className="text-3xl font-bold sm:text-4xl">Link ManageBac in under a minute</h2>
          <p className="mt-4 max-w-lg text-muted-foreground">
            Paste your ManageBac calendar subscription link and Academia brings in every deadline, then matches tasks to your subjects by class name. It’s the
            secure, student-authorised way to connect, because Academia never needs your ManageBac password.
          </p>
          <ul className="mt-8 space-y-4 text-sm">
            {[
              [KeyRound, "No password sharing", "Only the read-only calendar link, which you can reset in ManageBac at any time."],
              [LockKeyhole, "Encrypted at rest", "The link is encrypted with AES-256 before it’s stored and never shown again."],
              [CalendarSync, "One-way and automatic", "Syncs when you open your calendar, plus a manual “Sync now”. CSV import as a fallback."],
            ].map(([Icon, t, d]) => {
              const I = Icon as typeof KeyRound
              return (
                <li key={t as string} className="flex gap-3">
                  <I className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" />
                  <span>
                    <span className="block font-semibold">{t as string}</span>
                    <span className="text-muted-foreground">{d as string}</span>
                  </span>
                </li>
              )
            })}
          </ul>
        </div>
        <div className="rounded-[var(--radius-card)] border bg-card p-5 shadow-card" aria-label="Example of synced ManageBac deadlines" role="img">
          <div className="flex items-center justify-between rounded-lg border bg-field px-3 py-2 font-mono text-xs text-muted-foreground">
            <span className="truncate">webcal://yourschool.managebac.com/…/•••••.ics</span>
            <span className="ml-3 shrink-0 rounded-full bg-success/15 px-2 py-0.5 font-sans font-medium text-success-text">Connected</span>
          </div>
          <ul className="mt-4 divide-y">
            {items.map((it) => (
              <li key={it.t} className="flex items-center gap-3 py-3">
                <span className="h-8 w-1 rounded-full" style={{ backgroundColor: it.c }} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{it.t}</span>
                  <span className="block text-xs text-muted-foreground">{it.s}</span>
                </span>
                <span className="font-mono text-xs text-muted-foreground tabular">{it.d}</span>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-muted-foreground">Example data</p>
        </div>
      </div>
    </section>
  )
}

export function GradingExplainer() {
  const myp = [
    ["1", "1–5"],
    ["2", "6–9"],
    ["3", "10–14"],
    ["4", "15–18"],
    ["5", "19–23"],
    ["6", "24–27"],
    ["7", "28–32"],
  ]
  return (
    <section id="how-grades-work" aria-labelledby="grading-h" className="mx-auto max-w-6xl scroll-mt-16 px-4 py-24 sm:px-6">
      <h2 id="grading-h" className="text-3xl font-bold sm:text-4xl">How IB grades are calculated</h2>
      <p className="mt-3 max-w-2xl text-muted-foreground">
        The rules Academia follows, in plain language. For worked examples, read the{" "}
        <Link href="/guides/ib-grading" className="font-medium text-primary hover:underline">
          IB grading guide
        </Link>
        .
      </p>
      <div className="mt-10 grid gap-6 lg:grid-cols-2">
        <div className="rounded-[var(--radius-card)] border bg-card p-6 shadow-card">
          <h3 className="text-lg font-semibold">MYP: criteria A to D</h3>
          <p className="mt-2 text-sm text-muted-foreground">Four criteria, each out of 8, add up to a total out of 32 that converts to a 1–7.</p>
          <table className="mt-5 w-full text-sm">
            <caption className="sr-only">MYP criteria total needed for each grade</caption>
            <thead className="text-left text-xs text-muted-foreground">
              <tr>
                <th scope="col" className="pb-2 font-medium">Grade</th>
                <th scope="col" className="pb-2 font-medium">Criteria total (out of 32)</th>
              </tr>
            </thead>
            <tbody className="divide-y font-mono tabular">
              {myp.map(([g, r]) => (
                <tr key={g}>
                  <td className="py-2 font-semibold">{g}</td>
                  <td className="py-2">{r}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="rounded-[var(--radius-card)] border bg-card p-6 shadow-card">
          <h3 className="text-lg font-semibold">DP: weighted components</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Each component carries a weight from the subject guide. Your weighted percentage converts to a 1–7 using that subject’s grade boundaries, which change by
            subject and session, so Academia lets you edit them.
          </p>
          <dl className="mt-5 space-y-3 text-sm">
            {[
              ["Paper 1", "40%", "72%"],
              ["Paper 2", "40%", "65%"],
              ["Internal assessment", "20%", "85%"],
            ].map(([n, w, s]) => (
              <div key={n} className="flex items-center justify-between border-b pb-3">
                <dt>
                  {n} <span className="font-mono text-xs text-muted-foreground">{w}</span>
                </dt>
                <dd className="font-mono tabular">{s}</dd>
              </div>
            ))}
            <div className="flex items-center justify-between pt-1">
              <dt className="font-semibold">Weighted score</dt>
              <dd className="font-mono font-semibold tabular">71.8% → grade 6</dd>
            </div>
          </dl>
          <p className="mt-3 text-xs text-muted-foreground">Example using generic boundaries (7 at 80%, 6 at 70%, 5 at 60%).</p>
        </div>
      </div>
    </section>
  )
}

export function FaqSection() {
  return (
    <section id="faq" aria-labelledby="faq-h" className="mx-auto max-w-3xl scroll-mt-16 px-4 py-24 sm:px-6">
      <h2 id="faq-h" className="text-3xl font-bold sm:text-4xl">Questions, answered</h2>
      <Accordion className="mt-8">
        {FAQ.map((f) => (
          <AccordionItem key={f.q} value={f.q}>
            <AccordionTrigger className="py-4 text-left text-base font-semibold">{f.q}</AccordionTrigger>
            <AccordionContent className="pb-4 text-sm leading-relaxed text-muted-foreground">{f.a}</AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </section>
  )
}

export function SiteFooter() {
  return (
    <footer className="border-t">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:px-6 md:grid-cols-[1.5fr_1fr_1fr]">
        <div>
          <Logo />
          <p className="mt-3 max-w-xs text-sm text-muted-foreground">The IB grade tracker that shows exactly where you stand.</p>
        </div>
        <nav aria-label="Product">
          <h2 className="text-sm font-semibold">Product</h2>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li><Link href="/#features" className="hover:text-foreground">Features</Link></li>
            <li><Link href="/#managebac" className="hover:text-foreground">ManageBac integration</Link></li>
            <li><Link href="/guides/ib-grading" className="hover:text-foreground">IB grading guide</Link></li>
            <li><Link href="/signup" className="hover:text-foreground">Create an account</Link></li>
          </ul>
        </nav>
        <nav aria-label="Legal">
          <h2 className="text-sm font-semibold">Trust</h2>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li><Link href="/privacy" className="hover:text-foreground">Privacy policy</Link></li>
            <li><Link href="/terms" className="hover:text-foreground">Terms of use</Link></li>
            <li><Link href="/login" className="hover:text-foreground">Log in</Link></li>
          </ul>
        </nav>
      </div>
      <div className="border-t">
        <p className="mx-auto max-w-6xl px-4 py-6 text-xs text-muted-foreground sm:px-6">
          © {new Date().getFullYear()} Academia. Not affiliated with or endorsed by the International Baccalaureate Organization or Faria Education Group. IB and
          ManageBac are trademarks of their respective owners.
        </p>
      </div>
    </footer>
  )
}
