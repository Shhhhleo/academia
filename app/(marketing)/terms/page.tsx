import type { Metadata } from "next"
import Link from "next/link"
import { ProsePage } from "@/components/marketing/prose-page"

export const metadata: Metadata = {
  title: "Terms of use",
  description: "The rules for using Academia, including how estimated grades should be understood.",
  alternates: { canonical: "/terms" },
}

export default function TermsPage() {
  return (
    <ProsePage
      crumb="Terms"
      title="Terms of use"
      updated="2026-10-30"
      intro={<p>Plain-language terms for using Academia. By creating an account you agree to them.</p>}
    >
      <h2>Using Academia</h2>
      <ul>
        <li>Keep your login details private and use a password you don’t use anywhere else.</li>
        <li>Only enter information about your own studies, and only connect a ManageBac calendar link that belongs to you.</li>
        <li>Don’t try to access other people’s accounts, disrupt the service, or probe it for vulnerabilities without permission.</li>
      </ul>

      <h2>Estimated grades</h2>
      <p>
        Grades calculated by Academia are <strong>estimates</strong> based on the results you enter and the settings you choose. They are not official IB,
        MYP or school grades and may differ from the grades your teachers or the IB award. Always rely on your school’s reports and official IB results.
      </p>

      <h2>Your content</h2>
      <p>
        You own the data you add. You allow us to store and process it only to provide Academia to you. You can export or delete it at any time; see the{" "}
        <Link href="/privacy">privacy policy</Link>.
      </p>

      <h2>Third-party services</h2>
      <p>
        ManageBac integration uses the calendar link you provide and is read-only. Academia is independent and is not affiliated with or endorsed by the
        International Baccalaureate Organization or Faria Education Group. IB and ManageBac are trademarks of their respective owners.
      </p>

      <h2>Availability</h2>
      <p>
        We work to keep Academia available and your data safe, but the service is provided “as is” without guarantees. Keep your own copies of anything
        important; the export in Settings makes this easy.
      </p>

      <h2>Changes</h2>
      <p>We may update these terms. The date at the top shows when they last changed.</p>
    </ProsePage>
  )
}
