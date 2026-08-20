-- RLS cross-organization verification for SalesFlow (origin multi-tenant model)
-- Run: npx supabase db query --linked -f supabase/tests/rls_cross_org_verification.sql

CREATE TEMP TABLE rls_results (
  test_name text PRIMARY KEY,
  passed boolean NOT NULL,
  detail text
);

DO $main$
DECLARE
  inst_id uuid := '00000000-0000-0000-0000-000000000000';
  user_a uuid := 'a1111111-1111-4111-8111-111111111111';
  user_b uuid := 'b2222222-2222-4222-8222-222222222222';
  user_c uuid := 'c3333333-3333-4333-8333-333333333333';
  org_a uuid;
  org_b uuid;
  client_a uuid;
  client_b uuid;
  estimate_a uuid;
  bank_a uuid;
  cnt int;
  updated int;
  err text;
  pass_count int;
  fail_count int;
BEGIN
  INSERT INTO auth.instances (id, uuid, raw_base_config)
  VALUES (inst_id, inst_id, '{}'::text)
  ON CONFLICT (id) DO NOTHING;

  DELETE FROM auth.users WHERE email LIKE 'rls_test_%@verify.local';

  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at
  ) VALUES
    (inst_id, user_a, 'authenticated', 'authenticated', 'rls_test_a@verify.local',
     crypt('RlsTest!2026', gen_salt('bf')), now(),
     '{"provider":"email","providers":["email"]}'::jsonb,
     '{"display_name":"RLS User A","org_name":"RLS Org A"}'::jsonb, now(), now()),
    (inst_id, user_b, 'authenticated', 'authenticated', 'rls_test_b@verify.local',
     crypt('RlsTest!2026', gen_salt('bf')), now(),
     '{"provider":"email","providers":["email"]}'::jsonb,
     '{"display_name":"RLS User B","org_name":"RLS Org B"}'::jsonb, now(), now()),
    (inst_id, user_c, 'authenticated', 'authenticated', 'rls_test_c@verify.local',
     crypt('RlsTest!2026', gen_salt('bf')), now(),
     '{"provider":"email","providers":["email"]}'::jsonb,
     '{"display_name":"RLS User C","org_name":"RLS Org C spare"}'::jsonb, now(), now());

  SELECT om.organization_id INTO org_a
    FROM public.organization_members om WHERE om.user_id = user_a LIMIT 1;
  SELECT om.organization_id INTO org_b
    FROM public.organization_members om WHERE om.user_id = user_b LIMIT 1;

  IF org_a IS NULL OR org_b IS NULL OR org_a = org_b THEN
    RAISE EXCEPTION 'Expected two distinct orgs for users A and B, got org_a=%, org_b=%', org_a, org_b;
  END IF;

  INSERT INTO public.organization_members (organization_id, user_id, role)
  VALUES (org_a, user_c, 'member')
  ON CONFLICT DO NOTHING;

  INSERT INTO public.clients (id, organization_id, name)
  VALUES (gen_random_uuid(), org_a, 'RLS Client A')
  RETURNING id INTO client_a;

  INSERT INTO public.clients (id, organization_id, name)
  VALUES (gen_random_uuid(), org_b, 'RLS Client B')
  RETURNING id INTO client_b;

  INSERT INTO public.items (id, organization_id, name, unit_price)
  VALUES (gen_random_uuid(), org_a, 'RLS Item A', 1000);

  INSERT INTO public.estimates (
    id, organization_id, document_number, client_id, subject, issue_date, status,
    tax_display, tax_rounding, created_by
  ) VALUES (
    gen_random_uuid(), org_a, 'EST-A-001', client_a, 'RLS Estimate A', current_date, 'draft',
    'separate', 'round_down', user_a
  ) RETURNING id INTO estimate_a;

  INSERT INTO public.estimates (
    id, organization_id, document_number, client_id, subject, issue_date, status,
    tax_display, tax_rounding, created_by
  ) VALUES (
    gen_random_uuid(), org_b, 'EST-B-001', client_b, 'RLS Estimate B', current_date, 'draft',
    'separate', 'round_down', user_b
  );

  INSERT INTO public.bank_accounts (id, organization_id, bank_name, branch_name, account_type, account_number, account_holder)
  VALUES (gen_random_uuid(), org_a, 'Test Bank', 'Main', 'futsu', '1234567', 'RLS A')
  RETURNING id INTO bank_a;

  UPDATE public.company_profiles
     SET company_name_line1 = 'RLS Company A', tel = '03-0000-0001'
   WHERE organization_id = org_a;

  UPDATE public.company_profiles
     SET company_name_line1 = 'RLS Company B', tel = '03-0000-0002'
   WHERE organization_id = org_b;

  -- User A: cross-org read blocked
  PERFORM set_config('role', 'authenticated', true);
  PERFORM set_config('request.jwt.claims', json_build_object('sub', user_a::text, 'role', 'authenticated')::text, true);
  SELECT count(*) INTO cnt FROM public.clients WHERE organization_id = org_b;
  PERFORM set_config('role', 'postgres', true);
  INSERT INTO rls_results VALUES ('A cannot read org B clients', cnt = 0, format('count=%s', cnt));

  PERFORM set_config('role', 'authenticated', true);
  PERFORM set_config('request.jwt.claims', json_build_object('sub', user_a::text, 'role', 'authenticated')::text, true);
  SELECT count(*) INTO cnt FROM public.clients WHERE organization_id = org_a;
  PERFORM set_config('role', 'postgres', true);
  INSERT INTO rls_results VALUES ('A can read org A clients', cnt >= 1, format('count=%s', cnt));

  -- User B: cross-org read blocked
  PERFORM set_config('role', 'authenticated', true);
  PERFORM set_config('request.jwt.claims', json_build_object('sub', user_b::text, 'role', 'authenticated')::text, true);
  SELECT count(*) INTO cnt FROM public.clients WHERE organization_id = org_a;
  PERFORM set_config('role', 'postgres', true);
  INSERT INTO rls_results VALUES ('B cannot read org A clients', cnt = 0, format('count=%s', cnt));

  -- Co-member C: shared org A data
  PERFORM set_config('role', 'authenticated', true);
  PERFORM set_config('request.jwt.claims', json_build_object('sub', user_c::text, 'role', 'authenticated')::text, true);
  SELECT count(*) INTO cnt FROM public.clients WHERE organization_id = org_a;
  PERFORM set_config('role', 'postgres', true);
  INSERT INTO rls_results VALUES ('C (co-member) can read org A clients', cnt >= 1, format('count=%s', cnt));

  PERFORM set_config('role', 'authenticated', true);
  PERFORM set_config('request.jwt.claims', json_build_object('sub', user_c::text, 'role', 'authenticated')::text, true);
  SELECT count(*) INTO cnt FROM public.items WHERE organization_id = org_a;
  PERFORM set_config('role', 'postgres', true);
  INSERT INTO rls_results VALUES ('C (co-member) can read org A items', cnt >= 1, format('count=%s', cnt));

  PERFORM set_config('role', 'authenticated', true);
  PERFORM set_config('request.jwt.claims', json_build_object('sub', user_c::text, 'role', 'authenticated')::text, true);
  SELECT count(*) INTO cnt FROM public.company_profiles WHERE organization_id = org_a AND company_name_line1 = 'RLS Company A';
  PERFORM set_config('role', 'postgres', true);
  INSERT INTO rls_results VALUES ('C (co-member) can read org A company profile', cnt = 1, format('count=%s', cnt));

  PERFORM set_config('role', 'authenticated', true);
  PERFORM set_config('request.jwt.claims', json_build_object('sub', user_c::text, 'role', 'authenticated')::text, true);
  SELECT count(*) INTO cnt FROM public.clients WHERE organization_id = org_b;
  PERFORM set_config('role', 'postgres', true);
  INSERT INTO rls_results VALUES ('C cannot read org B clients', cnt = 0, format('count=%s', cnt));

  -- Cross-org UPDATE blocked
  PERFORM set_config('role', 'authenticated', true);
  PERFORM set_config('request.jwt.claims', json_build_object('sub', user_a::text, 'role', 'authenticated')::text, true);
  UPDATE public.clients SET name = 'HACKED' WHERE id = client_b;
  GET DIAGNOSTICS updated = ROW_COUNT;
  PERFORM set_config('role', 'postgres', true);
  INSERT INTO rls_results VALUES ('A cannot update org B client', updated = 0, format('row_count=%s', updated));

  SELECT name INTO err FROM public.clients WHERE id = client_b;
  INSERT INTO rls_results VALUES ('Org B client unchanged after A update attempt', err = 'RLS Client B', format('name=%s', err));

  -- Cross-org INSERT blocked
  BEGIN
    PERFORM set_config('role', 'authenticated', true);
    PERFORM set_config('request.jwt.claims', json_build_object('sub', user_a::text, 'role', 'authenticated')::text, true);
    INSERT INTO public.clients (organization_id, name) VALUES (org_b, 'Injected');
    PERFORM set_config('role', 'postgres', true);
    INSERT INTO rls_results VALUES ('A cannot insert into org B', false, 'insert succeeded unexpectedly');
  EXCEPTION WHEN insufficient_privilege THEN
    PERFORM set_config('role', 'postgres', true);
    INSERT INTO rls_results VALUES ('A cannot insert into org B', true, 'blocked by RLS');
  END;

  -- Estimates org isolation (origin: org-wide within membership, not author-only)
  PERFORM set_config('role', 'authenticated', true);
  PERFORM set_config('request.jwt.claims', json_build_object('sub', user_a::text, 'role', 'authenticated')::text, true);
  SELECT count(*) INTO cnt FROM public.estimates WHERE organization_id = org_b;
  PERFORM set_config('role', 'postgres', true);
  INSERT INTO rls_results VALUES ('A cannot read org B estimates', cnt = 0, format('count=%s', cnt));

  PERFORM set_config('role', 'authenticated', true);
  PERFORM set_config('request.jwt.claims', json_build_object('sub', user_a::text, 'role', 'authenticated')::text, true);
  SELECT count(*) INTO cnt FROM public.estimates WHERE id = estimate_a;
  PERFORM set_config('role', 'postgres', true);
  INSERT INTO rls_results VALUES ('A can read org A estimates', cnt = 1, format('count=%s', cnt));

  PERFORM set_config('role', 'authenticated', true);
  PERFORM set_config('request.jwt.claims', json_build_object('sub', user_c::text, 'role', 'authenticated')::text, true);
  SELECT count(*) INTO cnt FROM public.estimates WHERE organization_id = org_a;
  PERFORM set_config('role', 'postgres', true);
  INSERT INTO rls_results VALUES ('C (co-member) can read org A estimates', cnt >= 1, format('count=%s', cnt));

  -- Bank accounts org isolation
  PERFORM set_config('role', 'authenticated', true);
  PERFORM set_config('request.jwt.claims', json_build_object('sub', user_b::text, 'role', 'authenticated')::text, true);
  SELECT count(*) INTO cnt FROM public.bank_accounts WHERE organization_id = org_a;
  PERFORM set_config('role', 'postgres', true);
  INSERT INTO rls_results VALUES ('B cannot read org A bank accounts', cnt = 0, format('count=%s', cnt));

  PERFORM set_config('role', 'authenticated', true);
  PERFORM set_config('request.jwt.claims', json_build_object('sub', user_a::text, 'role', 'authenticated')::text, true);
  SELECT count(*) INTO cnt FROM public.bank_accounts WHERE id = bank_a;
  PERFORM set_config('role', 'postgres', true);
  INSERT INTO rls_results VALUES ('A can read org A bank accounts', cnt = 1, format('count=%s', cnt));

  -- auth_org_ids helper
  PERFORM set_config('role', 'authenticated', true);
  PERFORM set_config('request.jwt.claims', json_build_object('sub', user_a::text, 'role', 'authenticated')::text, true);
  SELECT count(*) INTO cnt FROM (SELECT public.auth_org_ids() AS oid) s WHERE s.oid = org_b;
  PERFORM set_config('role', 'postgres', true);
  INSERT INTO rls_results VALUES ('auth_org_ids for A excludes org B', cnt = 0, format('count=%s', cnt));

  PERFORM set_config('role', 'authenticated', true);
  PERFORM set_config('request.jwt.claims', json_build_object('sub', user_a::text, 'role', 'authenticated')::text, true);
  SELECT count(*) INTO cnt FROM (SELECT public.auth_org_ids() AS oid) s WHERE s.oid = org_a;
  PERFORM set_config('role', 'postgres', true);
  INSERT INTO rls_results VALUES ('auth_org_ids for A includes org A', cnt = 1, format('count=%s', cnt));

  PERFORM set_config('role', 'authenticated', true);
  PERFORM set_config('request.jwt.claims', json_build_object('sub', user_c::text, 'role', 'authenticated')::text, true);
  SELECT count(*) INTO cnt FROM (SELECT public.auth_org_ids() AS oid) s WHERE s.oid = org_a;
  PERFORM set_config('role', 'postgres', true);
  INSERT INTO rls_results VALUES ('auth_org_ids for C includes org A', cnt = 1, format('count=%s', cnt));

  SELECT count(*) INTO pass_count FROM rls_results WHERE passed;
  SELECT count(*) INTO fail_count FROM rls_results WHERE NOT passed;

  -- Cleanup: remove orgs (cascade business data) then users
  DELETE FROM public.organizations
   WHERE id IN (
     SELECT organization_id FROM public.organization_members
      WHERE user_id IN (user_a, user_b, user_c)
   );
  DELETE FROM auth.users WHERE email LIKE 'rls_test_%@verify.local';

  IF fail_count > 0 THEN
    INSERT INTO rls_results VALUES ('__SUMMARY__', false, format('%s failures, %s passed', fail_count, pass_count))
    ON CONFLICT (test_name) DO UPDATE SET passed = EXCLUDED.passed, detail = EXCLUDED.detail;
  ELSE
    INSERT INTO rls_results VALUES ('__SUMMARY__', true, format('all %s tests passed', pass_count))
    ON CONFLICT (test_name) DO UPDATE SET passed = EXCLUDED.passed, detail = EXCLUDED.detail;
  END IF;
END;
$main$;

SELECT test_name, passed, detail FROM rls_results ORDER BY test_name;
