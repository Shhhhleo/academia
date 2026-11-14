-- RLS isolation test. Run as the database owner (Supabase SQL editor / MCP execute_sql).
-- Everything happens inside one DO block that always ends by raising, so nothing persists.
-- Expected final message: "RLS_TEST PASS: ..." (any "RLS_TEST FAIL" means a policy hole).
do $$
declare
  a uuid := gen_random_uuid();
  b uuid := gen_random_uuid();
  a_year uuid;
  b_year uuid;
  a_subject uuid;
  n int;
  results text[] := '{}';
  failed boolean := false;
begin
  insert into auth.users (id, email, raw_user_meta_data)
  values (a, 'rls-a@example.test', '{"display_name":"Student A","programme":"DP"}'),
         (b, 'rls-b@example.test', '{"display_name":"Student B"}');

  select count(*) into n from public.profiles where id in (a, b);
  if n <> 2 then failed := true; results := array_append(results, ('bootstrap profiles missing')::text); end if;
  select id into a_year from public.academic_years where user_id = a and is_current;
  select id into b_year from public.academic_years where user_id = b and is_current;
  if a_year is null or b_year is null then failed := true; results := array_append(results, ('bootstrap year missing')::text); end if;

  -- Act as A
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  insert into public.subjects (academic_year_id, name, programme, level) values (a_year, 'Physics', 'DP', 'HL')
  returning id into a_subject;
  insert into public.assessments (subject_id, title, due_on, raw_score, max_score) values (a_subject, 'Paper 1', current_date, 30, 40);
  results := array_append(results, ('A can write own rows')::text);

  -- Act as B
  perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);

  select count(*) into n from public.subjects;
  if n <> 0 then failed := true; results := array_append(results, (format('B sees %s of A''s subjects', n))::text);
  else results := array_append(results, ('B reads 0 subjects')::text); end if;

  select count(*) into n from public.assessments;
  if n <> 0 then failed := true; results := array_append(results, ('B sees A''s assessments')::text);
  else results := array_append(results, ('B reads 0 assessments')::text); end if;

  select count(*) into n from public.profiles;
  if n <> 1 then failed := true; results := array_append(results, (format('B sees %s profiles', n))::text);
  else results := array_append(results, ('B reads only own profile')::text); end if;

  update public.subjects set name = 'hacked' where id = a_subject;
  get diagnostics n = row_count;
  if n <> 0 then failed := true; results := array_append(results, ('B updated A''s subject')::text);
  else results := array_append(results, ('B update affects 0 rows')::text); end if;

  delete from public.assessments where subject_id = a_subject;
  get diagnostics n = row_count;
  if n <> 0 then failed := true; results := array_append(results, ('B deleted A''s assessments')::text);
  else results := array_append(results, ('B delete affects 0 rows')::text); end if;

  begin
    insert into public.assessments (subject_id, title, due_on) values (a_subject, 'Injected', current_date);
    failed := true; results := array_append(results, ('B attached an assessment to A''s subject')::text);
  exception when foreign_key_violation then
    results := array_append(results, ('B cannot attach to A''s subject (FK)')::text);
  end;

  begin
    insert into public.subjects (user_id, academic_year_id, name) values (a, a_year, 'Forged');
    failed := true; results := array_append(results, ('B inserted a row owned by A')::text);
  exception when insufficient_privilege then
    results := array_append(results, ('B cannot forge user_id (RLS)')::text);
  end;

  insert into public.subjects (academic_year_id, name) values (b_year, 'Biology') returning id into a_subject;
  begin
    insert into public.assessments (subject_id, title, due_on, raw_score, max_score)
    values (a_subject, 'x', current_date, 50, 40);
    failed := true; results := array_append(results, ('raw > max accepted')::text);
  exception when check_violation then
    results := array_append(results, ('raw > max rejected')::text);
  end;
  begin
    insert into public.assessments (subject_id, title, due_on, criteria)
    values (a_subject, 'x', current_date, '{"A": 9}');
    failed := true; results := array_append(results, ('criterion 9 accepted')::text);
  exception when check_violation then
    results := array_append(results, ('criterion 9 rejected')::text);
  end;

  -- Anonymous role has no table access at all
  perform set_config('role', 'anon', true);
  begin
    perform 1 from public.subjects limit 1;
    failed := true; results := array_append(results, ('anon can query subjects')::text);
  exception when insufficient_privilege then
    results := array_append(results, ('anon denied')::text);
  end;

  perform set_config('role', 'postgres', true);
  raise exception '%', (case when failed then 'RLS_TEST FAIL: ' else 'RLS_TEST PASS: ' end) || array_to_string(results, '; ');
end;
$$;
