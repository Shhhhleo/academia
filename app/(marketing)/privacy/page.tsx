import type { Metadata } from "next"
import Link from "next/link"
import { ProsePage } from "@/components/marketing/prose-page"
import { site } from "@/lib/site"

export const metadata: Metadata = {
  title: "Privacy policy",
  description: "What Academia stores, why, who processes it, and how to export or delete your data.",
  alternates: { canonical: "/privacy" },
}

export default function PrivacyPage() {
  const contact = site.contactEmail ? (
    <a href={`mailto:${site.contactEmail}`}>{site.contactEmail}</a>
  ) : (
    "the contact address published by the site operator"
  )
  return (
    <ProsePage
      crumb="Privacy"
      title="Privacy policy"
      updated="2026-10-30"
      intro={<p>Your grades are personal. Academia collects only what it needs to track them, never sells your data, and lets you take it with you or delete it at any time.</p>}
    >
      <h2>What we store</h2>
      <ul>
        <li><strong>Account details:</strong> your email address, the name you choose, your IB programme and optional school and year group.</li>
        <li><strong>Academic records you enter:</strong> subjects, assessments, criterion levels, scores, goals, calendar events and notes.</li>
        <li><strong>ManageBac calendar link</strong> (only if you connect it): encrypted with AES-256-GCM before storage, used only to fetch your calendar, and never shown back in full.</li>
        <li><strong>Preferences:</strong> theme, accent colour, density and grading defaults.</li>
      </ul>

      <h2>How it is protected</h2>
      <p>
        Every record is tied to your account and protected by row-level security in the database, so one account cannot read or change another’s data.
        Passwords are handled by our authentication provider and are never visible to us. Connections are encrypted with HTTPS.
      </p>

      <h2>Who processes it</h2>
      <ul>
        <li><strong>Supabase</strong> hosts the database and authentication (data stored in the Mumbai, India region).</li>
        <li><strong>Vercel</strong> hosts the website and runs the application code.</li>
      </ul>
      <p>We do not use advertising trackers and do not sell or share your data with third parties for marketing.</p>

      <h2>Cookies and local storage</h2>
      <p>
        Academia uses essential cookies to keep you signed in and to remember the academic year you selected. Your browser’s local storage remembers display
        preferences such as theme and sidebar state. There are no advertising or cross-site tracking cookies.
      </p>

      <h2>Your choices</h2>
      <ul>
        <li>Export everything as JSON or your assessments as CSV from <Link href="/settings">Settings</Link>.</li>
        <li>Disconnect ManageBac at any time; you can also remove everything it imported.</li>
        <li>Delete your account from Settings. This permanently removes your account and all associated records.</li>
      </ul>

      <h2>Students under 16</h2>
      <p>
        Academia is designed for secondary-school students. If you are under the age of digital consent where you live, please use Academia with the agreement
        of a parent or guardian.
      </p>

      <h2>Contact</h2>
      <p>For privacy questions or requests, contact {contact}.</p>
    </ProsePage>
  )
}
