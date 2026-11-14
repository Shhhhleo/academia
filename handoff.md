# Academia — handoff

IB grade tracker for MYP and DP students: log every summative and exam, see your grade update, set goals, plan your study, and link ManageBac and Google Calendar.

- **Live site:** https://academia-ib.vercel.app
- **Code:** this folder, branch `feat/academia` (not pushed to any Git remote yet)
- **Status:** deployed and public. Two Supabase settings must be changed before friends can sign up (see [Do this first](#do-this-first)).

---

## Do this first

### 1. Let other people sign up (Supabase)
Supabase's free email sender only delivers to members of your Supabase team, so anyone else who signs up never gets their confirmation email.

Open the project at https://supabase.com/dashboard/project/gvakzncoftxptejpmjfc and choose one:

- **Simplest:** Authentication → Sign In / Providers → Email → turn **Confirm email** off → Save. New accounts can then sign in straight away.
- **Better long term:** Authentication → Emails → SMTP Settings → add a custom SMTP provider (Resend, Brevo and Postmark all have free tiers). Keep Confirm email on.

### 2. Point Supabase Auth at the live domain
Authentication → URL Configuration:

- **Site URL:** `https://academia-ib.vercel.app`
- **Redirect URLs:** add
  - `https://academia-ib.vercel.app/auth/callback`
  - `https://academia-ib.vercel.app/auth/confirm`
  - Keep `http://localhost:3000/**` for local development.

Without this, confirmation and password-reset links send people to `localhost`.

### 3. Google Search Console
Full steps are in [`seo/README.md`](seo/README.md). In short:

1. Add a **URL prefix** property for `https://academia-ib.vercel.app/`. A Domain property isn't possible on a `vercel.app` address.
2. Choose the **HTML tag** method and copy the `content="…"` value.
3. In Vercel, open Project `academia-ib` → Settings → Environment Variables. Add `GOOGLE_SITE_VERIFICATION` with that value (Production).
4. Redeploy (`npx vercel deploy --prod`), then click **Verify**.
5. Open **Sitemaps** and submit `sitemap.xml`.

---

## Running it

```bash
npm install
npm run dev        # http://localhost:3000
npm test           # 160 Vitest tests (grade engine, calendar, streaks, brief, security helpers)
npm run lint
npm run build
npx vercel deploy --prod   # deploy (CLI is logged in on this PC; project is linked in .vercel/)
```

- **Requirements:** Node 20+ (built on Node 24).
- **Next.js version:** 16.4.3, which has breaking changes (`proxy.ts` replaces middleware; params are async). Read `node_modules/next/dist/docs/` before changing framework code, as `AGENTS.md` says.

### Environment variables
Names only; values are in `.env.local` (gitignored) and in Vercel → Settings → Environment Variables.

| Name | What it is |
|---|---|
| `NEXT_PUBLIC_SITE_URL` | Public address used for canonical URLs, sitemap, Open Graph and email links. Production is `https://academia-ib.vercel.app`. |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase publishable key. Safe in the browser, because row-level security protects the data. |
| `ENCRYPTION_KEY` | 32 random bytes, base64. Encrypts the ManageBac and Google calendar links at rest. **Never change it on production.** Saved links would become unreadable, and users would have to reconnect. |
| `GOOGLE_SITE_VERIFICATION` | Optional. The Search Console HTML-tag code. |

- **Test account:** `.env.local` also holds a local test account (`TEST_USER_EMAIL` / `TEST_USER_PASSWORD`) for development only.
- **Demo data:** `supabase/seed/demo.sql` fills a demo account with 8 MYP subjects, assessments, goals and events.

### Hosting
- **Vercel:** project `academia-ib` in the `cod-3-x` scope, Hobby (free) plan.
  - It is not connected to Git, so deploy with the CLI.
  - Connecting a GitHub repo in Vercel would make every push deploy automatically.
  - `.vercelignore` keeps `.env*`, `video/`, `docs/`, `supabase/` and other non-app folders out of uploads.
- **Supabase:** project `gvakzncoftxptejpmjfc`, Mumbai region (ap-south-1), free plan.
  - Free projects **pause after about a week with no activity**. Unpause from the dashboard if that happens.
  - Migrations `supabase/migrations/0001_init.sql` and `0002_study_todos_reminders_feeds.sql` are both applied.

---

## What's in the app

| Area | Where | Notes |
|---|---|---|
| Landing, IB grading guide, privacy, terms | `app/(marketing)` | The scroll-scrubbed hero film was made with HyperFrames (`video/`). Also uses the old-TV shader and the supplied search input. |
| Sign up, log in, reset password | `app/(auth)`, `app/auth/*`, `lib/auth` | Supabase Auth. `proxy.ts` guards app routes. |
| Dashboard, subjects, assessments | `app/(app)/dashboard`, `subjects`, `assessments` | MYP criteria A–D out of 8. DP weighted components with editable boundaries. Estimated vs official grades. |
| Grade engine | `lib/grades` | Pure and fully tested. MYP uses 1–5→1 … 28–32→7; partial criteria are projected as round(mean × 4). DP uses weighted components plus a "what do I need" solver. |
| Calculator, goals, analytics | `app/(app)/calculator`, `goals`, `analytics` | Recharts with a validated colour palette (`lib/colors.ts`). |
| Study Log | `app/(app)/study`, `components/study`, `lib/study` | Pausable stopwatch that survives refresh, manual logging, daily and weekly goals, Snapchat-style streaks, weekly chart. |
| To-do | `app/(app)/todos`, `components/planner` | Grouped into overdue, today, upcoming and no date; priority and subject; undo. |
| Reminders and Daily Brief | `app/(app)/reminders`, `brief`, `lib/brief`, `components/app/brief-scheduler.tsx` | The brief explains the next 1–7 days. It shows a toast plus an optional desktop notification at the student's chosen time. |
| Calendar | `app/(app)/calendar`, `components/calendar` | Month, week and agenda views. Combines assessments, ManageBac, Google and your own events. |
| ManageBac | `app/(app)/integrations/managebac`, `lib/managebac` | Imports a read-only iCal subscription and matches tasks to subjects by class name. CSV import is also here. |
| Google Calendar (both ways) | `app/(app)/integrations/google-calendar`, `lib/calendar` | **Academia → Google:** a private `.ics` link (`/api/calendar/feed/<token>.ics`). **Google → Academia:** paste Google's secret iCal address. |
| Settings | `app/(app)/settings` | Theme, accent colour, density, programme, JSON/CSV export, delete account. The timezone and brief time live on the Reminders page. |
| Search, quick add | Top bar | ⌘K / Ctrl+K search; press N for quick add. |
| SEO and GEO | `app/sitemap.ts`, `robots.ts`, `manifest.ts`, `opengraph-image.tsx`, `public/llms.txt`, `components/seo` | JSON-LD on the marketing pages. App pages are `noindex`. |

### How the calendar links work
Linked calendars sync while the app is open:
- when you open the app, if the last sync was over 6 hours ago;
- every 30 minutes after that;
- whenever you press **Sync now**.

ManageBac and Google don't push changes to Academia, so there is no background sync while nobody has it open.

Each Google sync:
- covers the last 30 days and the next year;
- expands repeating events;
- removes future events that were deleted in Google.

Google re-reads Academia's export link on its own schedule, usually every few hours.

---

## Security model
- **Every table has row-level security** with own-row policies.
- **Child rows can only point at the same user's parents.** Child tables use composite `(parent_id, user_id)` foreign keys.
- **Signed-out visitors can't read the tables.** The `anon` role has no table access.
- **The export feed is safe without a sign-in.** It goes through one function, `calendar_feed(token)` (`SECURITY DEFINER`). That function accepts only a 256-bit token, stores just its SHA-256 hash, and returns only that token owner's items.
- **Calendar fetches can't be turned against the server.** Hosts are allow-listed and each redirect is re-checked. There is a 10 s timeout and a size cap: 2 MB for ManageBac, 8 MB for Google.
- **Calendar links are encrypted at rest.** They use AES-256-GCM and are never sent to the browser.
- **Other protections:**
  - an open-redirect guard on `?next=`;
  - a CSV formula-injection guard;
  - a strict CSP with HSTS, frame-deny, nosniff, Referrer-Policy and Permissions-Policy;
  - private, no-store caching on app pages;
  - origin-checked Server Actions for every write.
- **Review status:** an independent code review on 2026-10-30 found no way for one user to read another's data. Its 7 "should fix" items are fixed (commit `1b3f6f0`).
- **The Claude Security scan has not been run.** It needs Claude Code's Workflow tool, which wasn't available in this session. To run it, enable **Dynamic workflows** in Claude Code (`/config`), then run `/claude-security:claude-security` → Scan codebase.

### Decisions made during the build
- **CSP uses `'unsafe-inline'`, not per-request nonces.** This keeps pages statically cacheable.
- **Sessions are checked with `getClaims()`, which verifies the JWT locally.** A revoked session therefore lasts until its token expires (about 1 hour).
- **`cacheComponents` is off.**
- **Dashboard and calendar "today" is in UTC;** the Study Log, Brief and To-do use the profile timezone.

---

## Known limitations and small follow-ups
From the code review's "minor" list; none affects data safety.

- **Stopwatch:**
  - It credits the whole session to the day it started.
  - Sessions over 24 h can't be logged. Reset is the only fix, and it loses the time.
- **Streaks:** raising the daily goal re-judges past days, which can shorten an existing streak.
- **Shared computers:** the stopwatch and "brief already shown" flags are stored per browser, not per user.
- **Timezone:** it is auto-detected only while the profile still says `UTC`. People who travel should change it under Reminders → Daily brief.
- **Turning the export link off and on:** this deletes the old link and then creates a new one. If creating fails, there is no link until you try again.
- **ManageBac sync:**
  - It resets the title and subject of imported tasks you have edited.
  - It re-adds imported tasks you deleted, if they are still in the feed.
- **Reconnecting:** a calendar can't be reconnected within 60 seconds of a failed attempt.
- **DP grade boundaries** aren't checked to be in order.
- **Assessments and components:** an assessment can reference a component from another of the same user's subjects.
- **Timezone-dependent text** (reminder times, timed calendar items) can briefly flash on load because the server renders in UTC.
- **`supabase/tests/rls.sql`** doesn't yet cover the study, to-do, reminder and feed tables. They were tested by hand in this session and passed.
- **Alerts:** the Daily Brief and reminder alerts appear only while Academia is open in a browser tab. Background push would need a service worker plus a push service.

## Suggested next steps
1. Do the three steps in [Do this first](#do-this-first).
2. Push this repo to GitHub and connect it in Vercel for automatic deploys.
3. Fix the follow-ups above, starting with the stopwatch day split and per-user local storage.
4. Run the Claude Security scan.
5. Optional: a custom domain (Vercel → Domains), web push for the brief, and Google OAuth for instant two-way sync.

## Where the history lives
- **Design spec:** `docs/superpowers/specs/2026-10-30-academia-design.md`
- **Implementation plan:** `docs/superpowers/plans/2026-10-30-academia.md`
- **Git log on `feat/academia`:** each feature, fix and review round is its own commit.
