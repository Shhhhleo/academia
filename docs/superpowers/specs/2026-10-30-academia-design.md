# Academia: IB Grade Tracker, Design Spec

Date: 2026-10-30 · Status: awaiting review

## 1. Intent

**What the owner said.** A website for tracking IB grades. Each time a summative or exam is graded,
the student adds it to a subject and that subject's grade updates. It also needs: goals and progress
tracking, a calendar linked to ManageBac, a link between the Academia account and the student's ManageBac,
search for subjects and tasks, accounts that other students can sign up for, SEO and GEO with an XML sitemap,
strict privacy (no one can reach another account's grades), deep personal customisation, a professional
"Linear × Notion × Vercel" look (ACADEMIA theme), and three supplied components: the scroll-locked video
hero, the old-television shader and the search Input.

**Decisions confirmed.** Supabase (Postgres + Auth + Row-Level Security) hosted with Vercel. The hero
scrubs through a HyperFrames-rendered product film. The site launches on a free `*.vercel.app` subdomain.

**Assumptions (correct me).**
- Students may be in MYP or DP, and a student can switch programme between academic years.
- An MYP subject grade combines each criterion across counted tasks (default: average; options:
  latest, highest, median). The four criterion levels are summed (/32) and converted with the published
  IB 1–7 boundaries.
- A DP subject grade comes from weighted components (e.g. Paper 1 40%, IA 20%), producing a percentage
  that is mapped to 1–7 through boundaries the user can edit per subject (DP boundaries vary by subject and session).
- Estimated grades (calculated by Academia) are always visually distinct from school-reported grades.

**Success criteria.**
1. Adding a graded assessment updates the subject grade, trend, dashboard and goals right away.
2. A signed-in user can read and write only their own rows. This is enforced by the database, not only by the UI.
3. ManageBac deadlines appear in the Academia calendar after pasting the student's ManageBac calendar feed link.
4. Public pages score ≥ 95 for SEO in Lighthouse; `/sitemap.xml`, `/robots.txt` and `/llms.txt` are served.
5. Works at 375 / 768 / 1024 / 1440 px, in light, dark and system themes, keyboard-only and with reduced motion.

## 2. Reference analysis → design contract

| Reference | What we take | What we reject |
|---|---|---|
| **Notion** | Quiet collapsible sidebar; ⌘K search over everything; one dataset shown as table / board / calendar; property "chips"; generous whitespace | Block editor, nested pages, emoji page icons |
| **Google Calendar** | Month / week / agenda views; mini-month in the side panel; colour-coded calendars toggled on/off; click-to-open event popover; red "now" line | Meeting scheduling, invites, rooms |
| **ManageBac+** | Its vocabulary (Summative / Formative, Criteria A–D, Classes, Tasks); iCal calendar subscription as the student-authorised link; one-way sync semantics | Its dense admin UI; storing ManageBac passwords or scraping (insecure and against their terms) |
| **Linear / Vercel** | Monochrome surfaces + one restrained accent; thin borders; tabular mono numbers; crisp hover states | Gradient-heavy marketing tropes |

**ManageBac reality check.** ManageBac+ has no student OAuth. Its Public API uses admin-issued school
tokens. The student-authorised link is the private **calendar subscription (iCal) URL** from Calendar → Subscribe.
Academia supports, in order:
1. **iCal feed link** (primary): imports tasks/deadlines/events into the calendar and creates "upcoming"
   assessments matched to subjects by class name. One-way; re-sync on demand and automatically when stale (> 6 h).
2. **CSV import** (fallback): paste or upload grades exported from a gradebook or spreadsheet.
3. **School API token**: documented as "ask your school's ManageBac admin". Not built in v1 (YAGNI); the UI shows it as coming later.

## 3. Architecture

```
Browser ──► Next.js (App Router, Vercel)
              ├─ Server Components: read via Supabase server client (user's JWT → RLS applies)
              ├─ Server Actions: zod-validated writes, auth.getUser() check, revalidatePath
              ├─ Route handlers: /auth/callback, /auth/confirm, /api/managebac/sync
              └─ middleware.ts: refresh Supabase session cookie; guard /app routes
           ──► Supabase: Auth (email+password, confirm email, reset) · Postgres + RLS
```

- **Stack:** Next.js (latest stable, App Router, TypeScript strict), Tailwind CSS v4, shadcn/ui
  (`components/ui`), lucide-react, Recharts, next-themes, zod, date-fns, ical.js, three +
  @react-three/fiber + @react-three/drei (shader), Vitest.
- **No service-role key in the app.** Every query runs as the signed-in user, so RLS always applies.
  Account deletion uses a `SECURITY DEFINER` function that can only delete `auth.uid()`.
- **Grade engine** is pure TypeScript in `lib/grades/` with no I/O, fully unit-tested, and shared by
  dashboard, subject pages, calculator and analytics.

## 4. Data model (Postgres)

Every table has `user_id uuid not null references auth.users on delete cascade` and RLS enabled with
`using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()))` for
select/insert/update/delete. Child tables reference parents with **composite foreign keys**
`(parent_id, user_id) → parent(id, user_id)`, so a row can never be attached to another user's subject
even through a crafted request.

| Table | Key columns |
|---|---|
| `profiles` | `id` (= user), display_name, programme (`MYP`/`DP`), year_level, school_name, accent (`indigo`/`emerald`/`amber`/`rose`/`sky`/`slate`), density (`comfortable`/`compact`), default_aggregation, week_start |
| `academic_years` | label ("2026–27"), starts_on, ends_on, is_current |
| `subjects` | academic_year_id, name, subject_group, level (`SL`/`HL`/`MYP`), programme, color, target_grade (1–7), teacher, aggregation (`average`/`latest`/`highest`/`median`), boundaries jsonb (DP), reported_grade (school-reported, nullable), managebac_match (class name for iCal matching), archived, position |
| `components` | subject_id, name, weight (DP weighting categories, e.g. "Paper 1", 40) |
| `assessments` | subject_id, component_id?, title, kind (`summative`/`exam`/`mock`/`ia`/`formative`/`other`), status (`upcoming`/`graded`), due_on, counts (bool), raw_score, max_score, weight, criteria jsonb `{A..D: 0–8}`, notes, source (`manual`/`managebac`/`csv`), external_uid (dedupe) |
| `goals` | subject_id? (null = overall), title, metric (`subject_grade`/`total_points`/`custom`), target_value, deadline, achieved_at |
| `events` | subject_id?, title, starts_at, ends_at, all_day, kind (`deadline`/`exam`/`event`/`study`), source, external_uid |
| `integrations` | provider (`managebac`), feed_url_ciphertext (AES-256-GCM, key only on server), feed_host, status, last_synced_at, last_error |
| `import_runs` | integration_id, started_at, finished_at, status, added, updated, error |
| `notifications` | title, body, href, read_at |

Check constraints guard ranges (criteria 0–8, target 1–7, weights 0–100, `raw_score <= max_score`).
A `handle_new_user` trigger creates the profile and current academic year on sign-up.

## 5. Grade engine (`lib/grades`)

- **MYP:** per criterion, aggregate graded+counted levels by the subject's method. If all four
  criteria have data: sum (0–32) → 1–5:1, 6–9:2, 10–14:3, 15–18:4, 19–23:5, 24–27:6, 28–32:7. If some are
  missing: project from the present criteria (mean × 4) and flag `partial` ("based on 3 of 4 criteria").
- **DP:** each assessment → %, components weighted (normalised over components that have data;
  assessments within a component weighted by their own weight). % → grade via subject boundaries
  (default 80/70/60/50/40/30, editable).
- **Trend:** recompute the grade chronologically after each assessment, giving a series for charts and a delta vs. previous.
- **What-if / required score:** add hypothetical assessments; solve for the minimum % (DP) or criterion
  levels (MYP) needed on the next task to reach the target.
- **Totals:** DP = sum of six subjects (/42) shown with a core-points field (/3); MYP = sum of subjects (/56 for 8).

## 6. Pages

**Public (indexed):** `/` landing · `/guides/ib-grading` (how MYP and DP grades are calculated: GEO answer
page) · `/privacy` · `/terms` · `/login` · `/signup` · `/forgot-password`.
**Auth flow:** `/auth/callback`, `/auth/confirm`, `/reset-password`. Open-redirect-safe `next` param (relative paths only).
**App (noindex, auth required), left sidebar:**
Dashboard · My Subjects · Assessments · Calendar · Grade Calculator · Goals & Progress · Analytics ·
ManageBac Integration · Settings. (The Calendar entry is added to the requested list because a calendar was requested.)

- **Top bar:** ⌘K command palette (subjects, assessments, pages, actions) built on the supplied Input;
  academic-year selector; notifications popover; light/dark/system toggle; avatar menu.
- **Dashboard:** overview row (overall average, total points, goals on track, next deadline); subject
  cards (name, colour, big mono grade, Estimated/Reported badge, trend arrow + text, assessment count,
  target); grade-trend line chart; recent assessments; goal progress rings; upcoming from calendar.
- **Subject detail:** current grade hero; criteria breakdown (MYP bars A–D /8) or component breakdown (DP);
  performance chart; assessment history table; target + required-score card; settings drawer (aggregation,
  components and weights, boundaries, reported grade, ManageBac class match).
- **Assessments:** searchable, filterable (subject, kind, status, date range), sortable table; inline row
  actions; empty state with Quick Add.
- **Calendar:** month / week / agenda; mini-month; per-source and per-subject toggles; event popover;
  "now" line; create event; ManageBac events read-only with a source badge.
- **Grade Calculator:** pick subject → add what-if tasks → live projected grade; "what do I need?" solver.
- **Goals & Progress:** goals list with progress bars/rings; target-vs-current comparison chart; timeline.
- **Analytics:** historical trends per subject, kind comparison (exam vs summative), distribution,
  projected outcomes; every chart has a text summary and table fallback.
- **ManageBac Integration:** connection status, how-to steps for getting the feed link, paste/validate,
  sync now, import history, disconnect, CSV import.
- **Settings:** profile, programme, appearance (theme, accent colour, density), grading defaults,
  academic years, export data (JSON/CSV), delete account.
- **Quick Add FAB:** bottom-right button on every app page → dialog adapting to MYP (criteria) or DP (score/weight).

## 7. Visual system

ACADEMIA palette as CSS variables (light default, dark, system), mapped to shadcn tokens so all
components share them. Indigo is used only as an accent (primary buttons, focus ring, active nav, charts' primary series).
Fonts via `next/font`: Inter (UI), Plus Jakarta Sans (display), JetBrains Mono (numbers, tabular).
Radius: cards 12px, buttons/inputs 8px. 8px spacing grid. Lucide icons only. Grade colours always
pair with an icon and text (never colour alone). Motion: 150–250ms ease-out, transform/opacity only;
everything respects `prefers-reduced-motion`.

**Supplied components, fixed during integration:**
- *Scroll-locked hero:* the pasted version never releases the lock, so the page can't scroll past the hero.
  It will release at the end of the video and re-lock when scrolling back to the top. Keyboard
  (Space/PgDn/arrows) drives it; a "Skip intro" button is provided; reduced motion shows the final frame
  with no lock. Video is re-encoded with short keyframe intervals so scrubbing is smooth.
- *Shader:* placeholder `Component` removed; `useMemo` side-effect → `useEffect`; React 19 JSX typing via
  `ThreeElements`; theme colours (indigo/lavender, low intensity); paused when off-screen or reduced
  motion; lazy-loaded (`next/dynamic`, no SSR). Used behind the auth pages and the landing CTA band.
- *Input:* its `rounded-ele`, `bg-input`, `shadow-sm/2` tokens are defined in the theme; clear button gets an `aria-label`.

**Hero film (HyperFrames):** ~8 s, 1920×1080 + 1080×1920 mobile cut. The Academia dashboard assembles:
sidebar slides in, subject cards land, grades count up, trend line draws, ending on a full dashboard.
Title "Know exactly where you stand." fades into the tagline "Every grade. Every criterion. One clear picture."

## 8. Security

- RLS on every table + composite FKs (section 4); no service-role key in the app.
- `auth.getUser()` (server-verified) in middleware, server components and actions; never trust `getSession()` alone.
- zod validation for every action and route input; check constraints in the DB as a second line.
- ManageBac feed link: AES-256-GCM encrypted at rest (key in `ENCRYPTION_KEY`, server only), never
  returned to the browser (only masked host). **SSRF guard:** `https` only (webcal→https), host must
  end in `managebac.com` or `managebac.cn`, no redirects to other hosts, 10 s timeout, 2 MB limit.
- Security headers: CSP, HSTS, X-Frame-Options DENY, nosniff, Referrer-Policy, Permissions-Policy.
- Supabase Auth: email confirmation on, minimum password length 10, built-in rate limits; Next.js server actions provide CSRF protection.
- App routes `noindex`; `robots.txt` disallows them.

## 9. SEO / GEO

Metadata API with per-page titles and descriptions, canonical URLs from `NEXT_PUBLIC_SITE_URL`; `app/sitemap.ts`
→ `/sitemap.xml` (public pages only); `app/robots.ts`; `app/manifest.ts`; dynamic OG image; JSON-LD
(Organization, WebSite, SoftwareApplication, FAQPage, Article on the guide); `public/llms.txt`; semantic
headings; fast LCP (poster image for hero video, fonts self-hosted by next/font).

## 10. Testing and verification

- Vitest: grade engine (MYP boundaries, partial criteria, aggregation methods, DP weighting, solver),
  iCal parsing/matching, feed-URL validator (SSRF cases), redirect sanitiser, encryption round-trip.
- RLS check: two test users; user B's queries for user A's rows return nothing and inserts are rejected.
- Browser pass with screenshots at 375/768/1440 in light and dark; keyboard walk-through; reduced motion.
- Claude Security scan and a code review before handover.

## 11. Out of scope for v1

School API-token integration, push/email notifications, mobile apps, collaboration/sharing, paid
plans, Google sign-in (easy to add later via Supabase once Google OAuth credentials exist).

## 12. Launch notes

Supabase free project (region ap-south-1, Mumbai, nearest to IST). The free tier's built-in email sender is
rate-limited, so a custom SMTP sender (e.g. Resend) is needed before a public launch. Deploying to Vercel needs your
Vercel login; I'll prepare everything and ask before publishing.
