import type { Metadata } from "next"
import Link from "next/link"
import { ProsePage } from "@/components/marketing/prose-page"
import { JsonLd } from "@/components/seo/json-ld"
import { absoluteUrl, site } from "@/lib/site"

const UPDATED = "2026-10-30"
const TITLE = "How IB grades are calculated: MYP criteria and DP boundaries"
const DESCRIPTION =
  "A plain-language guide to IB grading. How MYP criteria A–D become a 1–7, how DP components and grade boundaries work, worked examples, and how to estimate your grade before reports."

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/guides/ib-grading" },
  openGraph: { type: "article", url: absoluteUrl("/guides/ib-grading"), title: TITLE, description: DESCRIPTION, siteName: site.name },
}

const MYP = [
  [1, "1–5"],
  [2, "6–9"],
  [3, "10–14"],
  [4, "15–18"],
  [5, "19–23"],
  [6, "24–27"],
  [7, "28–32"],
] as const

export default function GuidePage() {
  return (
    <>
      <JsonLd
        data={[
          {
            "@context": "https://schema.org",
            "@type": "Article",
            headline: TITLE,
            description: DESCRIPTION,
            datePublished: UPDATED,
            dateModified: UPDATED,
            author: { "@type": "Organization", name: site.name, url: site.url },
            publisher: { "@type": "Organization", name: site.name, logo: { "@type": "ImageObject", url: absoluteUrl("/icon.svg") } },
            mainEntityOfPage: absoluteUrl("/guides/ib-grading"),
            about: ["IB Middle Years Programme grading", "IB Diploma Programme grade boundaries"],
          },
          {
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "Home", item: absoluteUrl("/") },
              { "@type": "ListItem", position: 2, name: "IB grading guide", item: absoluteUrl("/guides/ib-grading") },
            ],
          },
        ]}
      />
      <ProsePage
        crumb="IB grading guide"
        title="How IB grades are calculated"
        updated={UPDATED}
        intro={
          <p>
            In short: <strong>MYP</strong> grades add four criterion levels (each out of 8) into a total out of 32 and convert it to 1–7.{" "}
            <strong>DP</strong> grades weight your component results into a percentage and convert it with subject-specific grade boundaries.
          </p>
        }
      >
        <h2 id="myp">MYP: from criteria A–D to a 1–7</h2>
        <p>
          Every MYP subject is assessed against four criteria, labelled A, B, C and D. Each criterion is marked on a scale from 0 to 8. Across the
          year your teacher judges the level that best fits your work in each criterion, then adds the four levels together. That total, out of 32,
          converts to a final grade from 1 to 7 using the published IB boundaries.
        </p>
        <table>
          <caption className="sr-only">IB MYP grade boundaries for the sum of criteria A to D</caption>
          <thead>
            <tr>
              <th scope="col">Final grade</th>
              <th scope="col">Criteria total (out of 32)</th>
            </tr>
          </thead>
          <tbody>
            {MYP.map(([g, r]) => (
              <tr key={g}>
                <td>
                  <strong>{g}</strong>
                </td>
                <td>{r}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <h3>Worked example</h3>
        <p>
          Over two summatives you score A: 6 then 8, B: 5, C: 7 then 7, and D: 6 then 5. Averaging each criterion gives A 7, B 5, C 7 and D 6 (5.5 rounds up).
          The total is <strong>25 out of 32</strong>, which sits in the 24–27 band, so the estimate is a <strong>6</strong>.
        </p>

        <h3>When a task only assesses some criteria</h3>
        <p>
          Many tasks assess two or three criteria, not all four. A fair estimate then uses only the criteria that have evidence. Academia projects the
          total from the criteria assessed so far (for example, A 6 and C 8 average 7, projected to 28 out of 32) and labels the grade “partial” until
          all four criteria have levels.
        </p>

        <h3>Average, latest or best fit?</h3>
        <p>
          IB teachers use professional best-fit judgement rather than a strict average, and they usually give more weight to recent, consistent work.
          That is why Academia lets you choose how levels are combined per subject: <strong>average</strong> (the default), <strong>latest</strong>,{" "}
          <strong>highest</strong> or <strong>median</strong>.
        </p>

        <h2 id="dp">DP: weighted components and grade boundaries</h2>
        <p>
          Each Diploma Programme subject is assessed through components set out in its subject guide, typically one to three exam papers plus internal
          assessment (IA). Each component carries a weight. Your result in each component becomes a percentage, the percentages are combined using the
          weights, and the weighted total converts to a 1–7 using that subject’s grade boundaries.
        </p>
        <div className="callout">
          <p>
            <strong>Grade boundaries are not fixed.</strong> They differ between subjects and levels and can change from one exam session to the next.
            Use the most recent boundaries your teacher shares. Academia’s defaults (7 from 80%, 6 from 70%, 5 from 60%, 4 from 50%, 3 from 40%, 2 from
            30%) are only a starting point and can be edited per subject.
          </p>
        </div>

        <h3>Worked example</h3>
        <table>
          <caption className="sr-only">Example DP subject with three weighted components</caption>
          <thead>
            <tr>
              <th scope="col">Component</th>
              <th scope="col">Weight</th>
              <th scope="col">Your result</th>
              <th scope="col">Contribution</th>
            </tr>
          </thead>
          <tbody>
            <tr><td>Paper 1</td><td>40%</td><td>72%</td><td>28.8</td></tr>
            <tr><td>Paper 2</td><td>40%</td><td>65%</td><td>26.0</td></tr>
            <tr><td>Internal assessment</td><td>20%</td><td>85%</td><td>17.0</td></tr>
            <tr><td><strong>Weighted total</strong></td><td></td><td></td><td><strong>71.8%</strong></td></tr>
          </tbody>
        </table>
        <p>
          With boundaries of 70% for a 6 and 80% for a 7, a weighted total of 71.8% is a <strong>6</strong>. How much a single result can move that total
          depends on the weight of the task, and finding the minimum score you need next is exactly what Academia’s “what do I need?” calculator does.
        </p>

        <h3>The Diploma points total</h3>
        <p>
          Each of your six subjects gives up to 7 points, for a maximum of 42. Theory of Knowledge and the Extended Essay together add up to 3 core points,
          giving a maximum of 45. A total of at least 24 is required for the diploma, alongside other conditions set by the IB, so check the current rules
          with your DP coordinator.
        </p>

        <h2 id="estimates">Estimated versus official grades</h2>
        <p>
          Anything you calculate yourself, in a spreadsheet or in Academia, is an <strong>estimate</strong>. Your school’s reported grades and, in the DP, your
          final IB results are the official ones. Academia keeps the two apart: calculated grades always carry an “Estimated” badge, and you can record the
          grade your school reports next to it.
        </p>

        <h2 id="track">Track it automatically</h2>
        <p>
          Academia applies these rules every time you log a result, so your 1–7 per subject, your trend and your distance from each target stay up to date.{" "}
          <Link href="/signup">Create a free account</Link>, or try the interactive calculator on the <Link href="/#try">home page</Link>.
        </p>
        <p className="text-sm">
          Academia is an independent tool and is not affiliated with or endorsed by the International Baccalaureate Organization.
        </p>
      </ProsePage>
    </>
  )
}
