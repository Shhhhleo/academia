-- Academia initial schema.
-- Every table is owned by a user (user_id = auth.uid()) and protected by RLS.
-- Child tables use composite foreign keys (parent_id, user_id) so a row can never
-- point at another user's parent, even through a crafted request.

-- ───────────────────────────── Types ─────────────────────────────
create type public.programme as enum ('MYP', 'DP');
create type public.aggregation as enum ('average', 'latest', 'highest', 'median');
create type public.subject_level as enum ('SL', 'HL', 'MYP');
create type public.assessment_kind as enum ('summative', 'exam', 'mock', 'ia', 'formative', 'other');
create type public.assessment_status as enum ('upcoming', 'graded');
create type public.event_kind as enum ('deadline', 'exam', 'event', 'study');
create type public.record_source as enum ('manual', 'managebac', 'csv');
create type public.goal_metric as enum ('subject_grade', 'total_points', 'custom');

-- ─────────────────────────── Helpers ────────────────────────────
create or replace function public.valid_criteria(c jsonb)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select jsonb_typeof(c) = 'object'
    and (c - array['A', 'B', 'C', 'D']) = '{}'::jsonb
    and not exists (
      select 1
      from jsonb_each(c) as e
      where not (
        jsonb_typeof(e.value) = 'null'
        or (
          jsonb_typeof(e.value) = 'number'
          and (e.value)::numeric between 0 and 8
          and (e.value)::numeric = trunc((e.value)::numeric)
        )
      )
    );
$$;

create or replace function public.valid_boundaries(b jsonb)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select b is null or (
    jsonb_typeof(b) = 'array'
    and jsonb_array_length(b) between 1 and 7
    and not exists (
      select 1
      from jsonb_array_elements(b) as e
      where not (
        jsonb_typeof(e -> 'grade') = 'number'
        and jsonb_typeof(e -> 'min') = 'number'
        and (e ->> 'grade')::numeric between 1 and 7
        and (e ->> 'min')::numeric between 0 and 100
      )
    )
  );
$$;

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ─────────────────────────── Tables ─────────────────────────────
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default '' check (char_length(display_name) <= 80),
  programme public.programme not null default 'MYP',
  year_level smallint check (year_level between 1 and 13),
  school_name text check (char_length(school_name) <= 120),
  accent text not null default 'indigo' check (accent in ('indigo', 'emerald', 'amber', 'rose', 'sky', 'slate')),
  density text not null default 'comfortable' check (density in ('comfortable', 'compact')),
  default_aggregation public.aggregation not null default 'average',
  week_start smallint not null default 1 check (week_start in (0, 1)),
  core_points smallint check (core_points between 0 and 3),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.academic_years (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  label text not null check (char_length(label) between 1 and 40),
  starts_on date not null,
  ends_on date not null,
  is_current boolean not null default false,
  created_at timestamptz not null default now(),
  unique (id, user_id),
  check (ends_on > starts_on)
);
create unique index academic_years_one_current on public.academic_years (user_id) where is_current;

create table public.subjects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  academic_year_id uuid not null,
  name text not null check (char_length(name) between 1 and 80),
  subject_group text check (char_length(subject_group) <= 80),
  level public.subject_level not null default 'MYP',
  programme public.programme not null default 'MYP',
  color text not null default '#4f46e5' check (color ~ '^#[0-9a-fA-F]{6}$'),
  target_grade smallint check (target_grade between 1 and 7),
  teacher text check (char_length(teacher) <= 80),
  aggregation public.aggregation not null default 'average',
  boundaries jsonb check (public.valid_boundaries(boundaries)),
  reported_grade smallint check (reported_grade between 1 and 7),
  managebac_match text check (char_length(managebac_match) <= 120),
  archived boolean not null default false,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id),
  foreign key (academic_year_id, user_id) references public.academic_years (id, user_id) on delete cascade
);

create table public.components (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  subject_id uuid not null,
  name text not null check (char_length(name) between 1 and 60),
  weight numeric(5, 2) not null check (weight > 0 and weight <= 100),
  position integer not null default 0,
  created_at timestamptz not null default now(),
  unique (id, user_id),
  foreign key (subject_id, user_id) references public.subjects (id, user_id) on delete cascade
);

create table public.assessments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  subject_id uuid not null,
  component_id uuid,
  title text not null check (char_length(title) between 1 and 160),
  kind public.assessment_kind not null default 'summative',
  status public.assessment_status not null default 'graded',
  due_on date not null,
  counts boolean not null default true,
  raw_score numeric(8, 2),
  max_score numeric(8, 2) check (max_score > 0),
  weight numeric(6, 2) not null default 1 check (weight > 0 and weight <= 100),
  criteria jsonb not null default '{}'::jsonb check (public.valid_criteria(criteria)),
  notes text check (char_length(notes) <= 2000),
  source public.record_source not null default 'manual',
  external_uid text check (char_length(external_uid) <= 300),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (raw_score is null or (max_score is not null and raw_score >= 0 and raw_score <= max_score)),
  unique nulls distinct (user_id, source, external_uid),
  foreign key (subject_id, user_id) references public.subjects (id, user_id) on delete cascade,
  foreign key (component_id, user_id) references public.components (id, user_id) on delete set null (component_id)
);

create table public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  subject_id uuid,
  title text not null check (char_length(title) between 1 and 120),
  metric public.goal_metric not null default 'subject_grade',
  target_value numeric(6, 2) not null check (target_value > 0 and target_value <= 100),
  current_value numeric(6, 2) check (current_value >= 0),
  deadline date,
  achieved_at timestamptz,
  created_at timestamptz not null default now(),
  foreign key (subject_id, user_id) references public.subjects (id, user_id) on delete cascade
);

create table public.events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  subject_id uuid,
  title text not null check (char_length(title) between 1 and 200),
  description text check (char_length(description) <= 4000),
  all_day boolean not null default true,
  starts_on date,
  ends_on date,
  starts_at timestamptz,
  ends_at timestamptz,
  kind public.event_kind not null default 'event',
  source public.record_source not null default 'manual',
  external_uid text check (char_length(external_uid) <= 300),
  created_at timestamptz not null default now(),
  check ((all_day and starts_on is not null) or (not all_day and starts_at is not null)),
  check (ends_on is null or starts_on is null or ends_on >= starts_on),
  check (ends_at is null or starts_at is null or ends_at >= starts_at),
  unique nulls distinct (user_id, source, external_uid),
  foreign key (subject_id, user_id) references public.subjects (id, user_id) on delete set null (subject_id)
);

create table public.integrations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  provider text not null default 'managebac' check (provider in ('managebac')),
  feed_url_ciphertext text check (char_length(feed_url_ciphertext) <= 4000),
  feed_host text check (char_length(feed_host) <= 255),
  status text not null default 'disconnected' check (status in ('connected', 'error', 'disconnected')),
  last_synced_at timestamptz,
  last_error text check (char_length(last_error) <= 500),
  created_at timestamptz not null default now(),
  unique (id, user_id),
  unique (user_id, provider)
);

create table public.import_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  integration_id uuid,
  kind text not null default 'managebac' check (kind in ('managebac', 'csv')),
  status text not null default 'running' check (status in ('running', 'success', 'error')),
  added integer not null default 0,
  updated integer not null default 0,
  skipped integer not null default 0,
  error text check (char_length(error) <= 500),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  foreign key (integration_id, user_id) references public.integrations (id, user_id) on delete cascade
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 160),
  body text check (char_length(body) <= 500),
  href text check (href is null or href ~ '^/[^/\\]'),
  read_at timestamptz,
  created_at timestamptz not null default now()
);

-- ─────────────────────────── Indexes ────────────────────────────
create index subjects_year_idx on public.subjects (academic_year_id, user_id);
create index components_subject_idx on public.components (subject_id, user_id);
create index assessments_subject_idx on public.assessments (subject_id, user_id);
create index assessments_component_idx on public.assessments (component_id, user_id);
create index assessments_user_due_idx on public.assessments (user_id, due_on);
create index goals_subject_idx on public.goals (subject_id, user_id);
create index goals_user_idx on public.goals (user_id);
create index events_subject_idx on public.events (subject_id, user_id);
create index events_user_day_idx on public.events (user_id, starts_on);
create index events_user_time_idx on public.events (user_id, starts_at);
create index import_runs_integration_idx on public.import_runs (integration_id, user_id);
create index import_runs_user_idx on public.import_runs (user_id, started_at desc);
create index notifications_user_idx on public.notifications (user_id, created_at desc);

-- ───────────────────────── updated_at ───────────────────────────
create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();
create trigger subjects_touch before update on public.subjects
  for each row execute function public.touch_updated_at();
create trigger assessments_touch before update on public.assessments
  for each row execute function public.touch_updated_at();

-- ──────────────────────── Row-level security ────────────────────
alter table public.profiles enable row level security;
create policy "profiles: read own" on public.profiles for select to authenticated using (id = (select auth.uid()));
create policy "profiles: update own" on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

do $$
declare
  t text;
begin
  foreach t in array array[
    'academic_years', 'subjects', 'components', 'assessments', 'goals',
    'events', 'integrations', 'import_runs', 'notifications'
  ]
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format(
      'create policy %I on public.%I for select to authenticated using (user_id = (select auth.uid()))',
      t || ': read own', t);
    execute format(
      'create policy %I on public.%I for insert to authenticated with check (user_id = (select auth.uid()))',
      t || ': insert own', t);
    execute format(
      'create policy %I on public.%I for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()))',
      t || ': update own', t);
    execute format(
      'create policy %I on public.%I for delete to authenticated using (user_id = (select auth.uid()))',
      t || ': delete own', t);
  end loop;
end;
$$;

-- Anonymous visitors never touch app data.
revoke all on all tables in schema public from anon;

-- ─────────────────────── New-user bootstrap ──────────────────────
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  y int := extract(year from now() at time zone 'utc')::int;
  m int := extract(month from now() at time zone 'utc')::int;
  start_year int := case when m >= 8 then y else y - 1 end;
  prog public.programme := case
    when new.raw_user_meta_data ->> 'programme' = 'DP' then 'DP'::public.programme
    else 'MYP'::public.programme
  end;
begin
  insert into public.profiles (id, display_name, programme)
  values (
    new.id,
    left(coalesce(nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''), split_part(new.email, '@', 1)), 80),
    prog
  );

  insert into public.academic_years (user_id, label, starts_on, ends_on, is_current)
  values (
    new.id,
    start_year::text || '–' || right((start_year + 1)::text, 2),
    make_date(start_year, 8, 1),
    make_date(start_year + 1, 7, 31),
    true
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

revoke execute on function public.handle_new_user() from public, anon, authenticated;

-- ─────────────────────── Account deletion ───────────────────────
-- Deletes only the caller's own auth user; every table cascades from it.
create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
begin
  if uid is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;
  delete from auth.users where id = uid;
end;
$$;

revoke execute on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
