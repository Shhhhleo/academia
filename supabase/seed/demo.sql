-- Demo data for the local test account (demo.student@academia.test). Safe to re-run: it clears that user's subjects first.
do $$
declare
  uid uuid := (select id from auth.users where email = 'demo.student@academia.test');
  yr uuid;
  s record;
  sid uuid;
begin
  if uid is null then raise exception 'demo user not found'; end if;
  select id into yr from public.academic_years where user_id = uid and is_current;
  delete from public.subjects where user_id = uid;
  delete from public.goals where user_id = uid;
  delete from public.events where user_id = uid and source = 'manual';
  delete from public.notifications where user_id = uid;

  for s in
    select * from (values
      (0, 'Language and Literature', 'Language and literature', '#2a78d6', 7, 'Ms. Fernandes', 'English A'),
      (1, 'French', 'Language acquisition', '#eb6834', 6, 'M. Laurent', 'French Phase 4'),
      (2, 'Individuals and Societies', 'Individuals and societies', '#1baf7a', 6, 'Mr. Shah', 'Individuals & Societies'),
      (3, 'Sciences', 'Sciences', '#eda100', 7, 'Dr. Rao', 'Integrated Sciences'),
      (4, 'Mathematics', 'Mathematics', '#e87ba4', 7, 'Mr. Okafor', 'Extended Mathematics'),
      (5, 'Visual Arts', 'Arts', '#008300', 6, 'Ms. Ito', 'Visual Arts'),
      (6, 'Physical and Health Education', 'Physical and health education', '#6250d6', 5, 'Coach Mehta', 'PHE'),
      (7, 'Design', 'Design', '#e34948', 6, 'Mr. Kim', 'Digital Design')
    ) as t(pos, name, grp, color, target, teacher, mb)
  loop
    insert into public.subjects (user_id, academic_year_id, name, subject_group, level, programme, color, target_grade, teacher, managebac_match, position)
    values (uid, yr, s.name, s.grp, 'MYP', 'MYP', s.color, s.target, s.teacher, s.mb, s.pos)
    returning id into sid;

    insert into public.assessments (user_id, subject_id, title, kind, status, due_on, criteria)
    select uid, sid, a.title, a.kind::public.assessment_kind, a.status::public.assessment_status, a.due::date, a.crit::jsonb
    from (values
      (0, 'Unit 1: Persuasive speech', 'summative', 'graded', '2026-09-04', '{"A":6,"B":5,"C":6,"D":5}'),
      (0, 'Unit 2: Poetry commentary', 'summative', 'graded', '2026-10-02', '{"A":7,"B":6,"C":6,"D":7}'),
      (0, 'Unit 3: Comparative essay', 'summative', 'upcoming', '2026-11-06', '{}'),
      (1, 'Listening & reading test', 'exam', 'graded', '2026-09-11', '{"A":5,"B":5}'),
      (1, 'Oral presentation', 'summative', 'graded', '2026-10-09', '{"C":6}'),
      (1, 'Writing task: lettre formelle', 'summative', 'graded', '2026-10-23', '{"D":5}'),
      (2, 'Migration case study', 'summative', 'graded', '2026-09-17', '{"A":5,"B":6,"C":5,"D":4}'),
      (2, 'Source analysis test', 'exam', 'graded', '2026-10-15', '{"A":6,"D":6}'),
      (2, 'Research project proposal', 'summative', 'upcoming', '2026-11-12', '{}'),
      (3, 'Unit 2 Forces lab report', 'summative', 'graded', '2026-09-18', '{"A":6,"B":5,"C":7,"D":6}'),
      (3, 'Chemistry reactions test', 'exam', 'graded', '2026-10-16', '{"A":7}'),
      (3, 'Ecology investigation', 'summative', 'upcoming', '2026-11-04', '{}'),
      (4, 'Algebra unit test', 'exam', 'graded', '2026-09-09', '{"A":5,"C":5}'),
      (4, 'Investigation: patterns', 'summative', 'graded', '2026-09-30', '{"B":6,"C":6}'),
      (4, 'Real-life modelling task', 'summative', 'graded', '2026-10-21', '{"D":6,"C":7}'),
      (4, 'Geometry & trigonometry test', 'exam', 'upcoming', '2026-11-10', '{}'),
      (5, 'Process journal check', 'formative', 'graded', '2026-09-12', '{"B":5}'),
      (5, 'Artist study', 'summative', 'graded', '2026-10-07', '{"A":6,"B":6,"C":5,"D":6}'),
      (6, 'Fitness plan', 'summative', 'graded', '2026-09-25', '{"A":4,"B":5,"C":4,"D":5}'),
      (6, 'Badminton performance', 'summative', 'graded', '2026-10-20', '{"C":5,"D":5}'),
      (7, 'Inquiring & analysing', 'summative', 'graded', '2026-09-22', '{"A":5}'),
      (7, 'Developing ideas', 'summative', 'graded', '2026-10-13', '{"B":6}'),
      (7, 'Prototype build', 'summative', 'upcoming', '2026-11-18', '{}')
    ) as a(pos, title, kind, status, due, crit)
    where a.pos = s.pos;
  end loop;

  update public.assessments set counts = false where user_id = uid and kind = 'formative';

  insert into public.goals (user_id, subject_id, title, metric, target_value, deadline)
  select uid, id, '7 in ' || name, 'subject_grade', 7, '2027-06-15' from public.subjects where user_id = uid and name in ('Sciences', 'Mathematics');
  insert into public.goals (user_id, title, metric, target_value, deadline)
  values (uid, '48 points overall this year', 'total_points', 48, '2027-06-15');

  insert into public.events (user_id, title, kind, all_day, starts_on)
  values (uid, 'Parent–teacher conferences', 'event', true, '2026-11-05'),
         (uid, 'Personal Project check-in', 'deadline', true, '2026-11-09');
end;
$$;
