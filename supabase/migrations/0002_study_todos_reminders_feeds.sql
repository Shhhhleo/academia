-- Study log, to-dos, reminders, daily brief preferences, Google Calendar import and the
-- private iCal feed that Google Calendar (or any calendar app) can subscribe to.

alter type public.record_source add value if not exists 'google';

alter table public.profiles
  add column timezone text not null default 'UTC' check (char_length(timezone) between 1 and 64),
  add column brief_enabled boolean not null default true,
  add column brief_time time not null default '07:00',
  add column brief_days smallint not null default 3 check (brief_days between 1 and 14),
  add column daily_study_goal_minutes smallint not null default 60 check (daily_study_goal_minutes between 5 and 720),
  add column weekly_study_goal_minutes integer not null default 300 check (weekly_study_goal_minutes between 0 and 5040);

alter table public.integrations drop constraint integrations_provider_check;
alter table public.integrations add constraint integrations_provider_check check (provider in ('managebac', 'google'));
alter table public.import_runs drop constraint import_runs_kind_check;
alter table public.import_runs add constraint import_runs_kind_check check (kind in ('managebac', 'csv', 'google'));

create table public.study_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  subject_id uuid,
  studied_on date not null,
  minutes integer not null check (minutes between 1 and 1440),
  started_at timestamptz,
  note text check (char_length(note) <= 500),
  created_at timestamptz not null default now(),
  foreign key (subject_id, user_id) references public.subjects (id, user_id) on delete set null (subject_id)
);
create index study_sessions_user_day_idx on public.study_sessions (user_id, studied_on desc);
create index study_sessions_subject_idx on public.study_sessions (subject_id, user_id);

create table public.todos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  subject_id uuid,
  title text not null check (char_length(title) between 1 and 200),
  notes text check (char_length(notes) <= 2000),
  due_on date,
  priority smallint not null default 1 check (priority between 0 and 2),
  done_at timestamptz,
  created_at timestamptz not null default now(),
  foreign key (subject_id, user_id) references public.subjects (id, user_id) on delete set null (subject_id)
);
create index todos_user_idx on public.todos (user_id, done_at, due_on);
create index todos_subject_idx on public.todos (subject_id, user_id);

create table public.reminders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  subject_id uuid,
  title text not null check (char_length(title) between 1 and 200),
  notes text check (char_length(notes) <= 1000),
  remind_at timestamptz not null,
  done_at timestamptz,
  created_at timestamptz not null default now(),
  foreign key (subject_id, user_id) references public.subjects (id, user_id) on delete set null (subject_id)
);
create index reminders_user_idx on public.reminders (user_id, remind_at);
create index reminders_subject_idx on public.reminders (subject_id, user_id);

-- One private feed per user. Only a SHA-256 hash of the token is stored.
create table public.calendar_feeds (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() unique references auth.users (id) on delete cascade,
  token_hash text not null unique check (token_hash ~ '^[0-9a-f]{64}$'),
  created_at timestamptz not null default now(),
  last_accessed_at timestamptz
);

do $$
declare
  t text;
begin
  foreach t in array array['study_sessions', 'todos', 'reminders', 'calendar_feeds']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy %I on public.%I for select to authenticated using (user_id = (select auth.uid()))', t || ': read own', t);
    execute format('create policy %I on public.%I for insert to authenticated with check (user_id = (select auth.uid()))', t || ': insert own', t);
    execute format('create policy %I on public.%I for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()))', t || ': update own', t);
    execute format('create policy %I on public.%I for delete to authenticated using (user_id = (select auth.uid()))', t || ': delete own', t);
  end loop;
end;
$$;

revoke all on public.study_sessions, public.todos, public.reminders, public.calendar_feeds from anon;

-- Returns the calendar for the owner of a feed token, or null. Callable without a session
-- (calendar apps fetch anonymously) but only ever reveals the token owner's own items.
create or replace function public.calendar_feed(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid;
  h text;
begin
  if p_token is null or p_token !~ '^[A-Za-z0-9_-]{43}$' then
    return null;
  end if;
  h := encode(extensions.digest(p_token, 'sha256'), 'hex');
  update public.calendar_feeds set last_accessed_at = now() where token_hash = h returning user_id into uid;
  if uid is null then
    return null;
  end if;

  return jsonb_build_object(
    'assessments', coalesce((
      select jsonb_agg(jsonb_build_object('id', a.id, 'title', a.title, 'kind', a.kind, 'status', a.status, 'due_on', a.due_on, 'subject', s.name))
      from public.assessments a join public.subjects s on s.id = a.subject_id
      where a.user_id = uid and a.due_on >= current_date - 30 and a.due_on <= current_date + 365
    ), '[]'::jsonb),
    'events', coalesce((
      select jsonb_agg(jsonb_build_object('id', e.id, 'title', e.title, 'all_day', e.all_day, 'starts_on', e.starts_on, 'ends_on', e.ends_on,
        'starts_at', e.starts_at, 'ends_at', e.ends_at, 'kind', e.kind, 'description', e.description))
      from public.events e
      where e.user_id = uid and e.source = 'manual'
        and coalesce(e.starts_on, e.starts_at::date) between current_date - 30 and current_date + 365
    ), '[]'::jsonb),
    'reminders', coalesce((
      select jsonb_agg(jsonb_build_object('id', r.id, 'title', r.title, 'remind_at', r.remind_at, 'notes', r.notes))
      from public.reminders r
      where r.user_id = uid and r.done_at is null and r.remind_at >= now() - interval '30 days'
    ), '[]'::jsonb),
    'todos', coalesce((
      select jsonb_agg(jsonb_build_object('id', t.id, 'title', t.title, 'due_on', t.due_on))
      from public.todos t
      where t.user_id = uid and t.done_at is null and t.due_on is not null
    ), '[]'::jsonb)
  );
end;
$$;

revoke execute on function public.calendar_feed(text) from public;
grant execute on function public.calendar_feed(text) to anon, authenticated;
