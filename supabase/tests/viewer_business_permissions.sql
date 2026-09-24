-- Run with psql -v ON_ERROR_STOP=1 against an isolated migrated Supabase database.
-- Fixtures, counter increments, and permission probes are always rolled back.
begin;
do $$
declare
  _owner uuid := '00000000-0000-4000-8000-000000003301';
  _member uuid := '00000000-0000-4000-8000-000000003302';
  _viewer uuid := '00000000-0000-4000-8000-000000003303';
  _other uuid := '00000000-0000-4000-8000-000000003304';
  _admin uuid := '00000000-0000-4000-8000-000000003305';
  _org uuid; _other_org uuid; _id uuid; _client uuid; _item uuid; _invoice uuid; _payment uuid; _notification uuid;
  _ids uuid[] := '{}'; _kind text; _table text; _line text; _count bigint;
  _denied boolean; _user uuid; _number text; _header jsonb; _lines jsonb;
begin
  insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data)
  select id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
    'viewer-rls-' || id || '@example.invalid', '{}'
  from unnest(array[_owner, _member, _viewer, _other, _admin]) id;
  select organization_id into _org from public.organization_members where user_id = _owner;
  select organization_id into _other_org from public.organization_members where user_id = _other;
  insert into public.organization_members(organization_id, user_id, role) values
    (_org, _member, 'member'), (_org, _viewer, 'viewer'), (_org, _admin, 'admin');
  insert into public.clients(organization_id, name) values (_org, 'Viewer RLS client') returning id into _client;
  insert into public.items(organization_id, name, unit_price) values (_org, 'Viewer RLS item', 100) returning id into _item;
  foreach _table in array array['estimates','invoices','delivery_notes','receipts'] loop
    execute format('insert into public.%I(organization_id, document_number, subject, issue_date, tax_display, tax_rounding) values ($1, $2, ''Original'', current_date, ''separate'', ''round_down'') returning id', _table)
      into _id using _org, 'VIEWER-RLS-' || _table;
    _ids := array_append(_ids, _id);
    _line := case _table when 'delivery_notes' then 'delivery_note_line_items' else rtrim(_table, 's') || '_line_items' end;
    execute format('insert into public.%I(document_id, line_no, name_snapshot, qty, unit_price_snapshot, tax_category, tax_rate_snapshot) values ($1, 1, ''Original line'', 1, 100, ''standard_10'', 0.1)', _line) using _id;
  end loop;
  _invoice := _ids[2];
  insert into public.payments(organization_id, invoice_id, paid_at, amount)
    values (_org, _invoice, current_date, 20) returning id into _payment;
  insert into public.notifications(organization_id, user_id, kind, title)
    values (_org, _viewer, 'test', 'Viewer read marker') returning id into _notification;

  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claim.sub', _viewer::text, true);
  assert (select count(*) from public.clients where id = _client) = 1, 'viewer reads organization clients';
  assert (select count(*) from public.items where id = _item) = 1, 'viewer reads organization items';
  assert not public.auth_has_role_in_org(_org, array['owner','admin','member']::public.member_role[]), 'actual viewer role is used';
  foreach _table in array array['estimates','invoices','delivery_notes','receipts'] loop
    _line := case _table when 'delivery_notes' then 'delivery_note_line_items' else rtrim(_table, 's') || '_line_items' end;
    execute format('select id from public.%I where organization_id = $1', _table) into _id using _org;
    assert _id is not null, 'viewer reads each document kind';
    execute format('select count(*) from public.%I where document_id = $1', _line) into _count using _id;
    assert _count = 1, 'viewer reads each document line kind';
    execute format('update public.%I set subject = ''Changed'' where id = $1', _table) using _id;
    get diagnostics _count = row_count;
    assert _count = 0, 'viewer cannot update document headers';
    execute format('delete from public.%I where id = $1', _table) using _id;
    get diagnostics _count = row_count;
    assert _count = 0, 'viewer cannot delete document headers';
    execute format('update public.%I set qty = 9 where document_id = $1', _line) using _id;
    get diagnostics _count = row_count;
    assert _count = 0, 'viewer cannot change line amounts';
    execute format('delete from public.%I where document_id = $1', _line) using _id;
    get diagnostics _count = row_count;
    assert _count = 0, 'viewer cannot delete lines';
    _denied := false;
    begin
      execute format('insert into public.%I(document_id, line_no, name_snapshot, qty, unit_price_snapshot, tax_category, tax_rate_snapshot) values ($1, 2, ''Injected'', 1, 900, ''standard_10'', 0.1)', _line) using _id;
    exception when insufficient_privilege then _denied := true; end;
    assert _denied, 'viewer cannot insert lines';
    _denied := false;
    begin
      execute format('insert into public.%I(organization_id, document_number, issue_date, tax_display, tax_rounding) values ($1, ''VIEWER-INSERT'', current_date, ''separate'', ''round_down'')', _table) using _org;
    exception when insufficient_privilege then _denied := true; end;
    assert _denied, 'viewer cannot insert document headers';
  end loop;
  _denied := false;
  begin
    perform public.save_sales_document('invoice', jsonb_build_object('organization_id', _org, 'document_number', 'VIEWER-RPC', 'issue_date', current_date, 'tax_display', 'separate', 'tax_rounding', 'round_down'),
      '[{"name_snapshot":"Injected","qty":1,"unit_price_snapshot":100,"tax_category":"standard_10"}]');
  exception when insufficient_privilege then _denied := true; end;
  assert _denied, 'atomic save RPC cannot bypass viewer RLS';
  update public.clients set name = 'Changed' where id = _client;
  get diagnostics _count = row_count;
  assert _count = 0, 'viewer cannot change clients';
  update public.items set unit_price = 999 where id = _item;
  get diagnostics _count = row_count;
  assert _count = 0, 'viewer cannot change items';
  update public.payments set amount = 999 where id = _payment;
  get diagnostics _count = row_count;
  assert _count = 0, 'viewer cannot change the payment ledger';
  delete from public.payments where id = _payment;
  get diagnostics _count = row_count;
  assert _count = 0, 'viewer cannot delete payment records';
  _denied := false;
  begin
    insert into public.payments(organization_id, invoice_id, paid_at, amount) values (_org, _invoice, current_date, 99);
  exception when insufficient_privilege then _denied := true; end;
  assert _denied, 'viewer cannot insert payment records';
  assert (select paid_amount from public.invoices where id = _invoice) = 20, 'denied ledger mutations do not change the invoice balance';
  _denied := false;
  begin
    insert into public.share_tokens(token, organization_id, target_table, target_id)
      values ('viewer-rls-share', _org, 'invoices', _invoice);
  exception when insufficient_privilege then _denied := true; end;
  assert _denied, 'viewer cannot create public document links';
  update public.document_defaults set numbering_rule = 'Changed' where organization_id = _org;
  get diagnostics _count = row_count;
  assert _count = 0, 'viewer cannot change organization defaults';
  _denied := false;
  begin
    perform public.next_document_number(_org, 'invoice', current_date);
  exception when insufficient_privilege then _denied := true; end;
  assert _denied, 'viewer cannot consume document sequence numbers';
  _denied := false;
  begin
    insert into storage.objects(bucket_id, name) values ('org-logos', _org || '/viewer-test.png');
  exception when insufficient_privilege then _denied := true; end;
  assert _denied, 'viewer cannot upload organization files';
  update public.profiles set display_name = 'Viewer self edit' where id = _viewer;
  get diagnostics _count = row_count;
  assert _count = 1, 'viewer retains personal profile changes';
  update public.notifications set read_at = now() where id = _notification;
  get diagnostics _count = row_count;
  assert _count = 1, 'viewer retains personal notification read markers';
  update public.organization_members set role = 'owner' where organization_id = _org and user_id = _viewer;
  get diagnostics _count = row_count;
  assert _count = 0, 'viewer cannot promote their own role';
  perform set_config('request.jwt.claim.sub', _member::text, true);
  update public.organization_members set role = 'owner' where organization_id = _org and user_id = _member;
  get diagnostics _count = row_count;
  assert _count = 0, 'member still cannot manage organization roles';

  -- All existing writer roles retain their business permissions.
  foreach _user in array array[_member, _admin, _owner] loop
    perform set_config('request.jwt.claim.sub', _user::text, true);
    update public.clients set name = 'Writer allowed' where id = _client;
    get diagnostics _count = row_count;
    assert _count = 1, 'member/admin/owner can edit business data';
    _number := public.next_document_number(_org, 'invoice', current_date);
    assert _number is not null, 'writer can allocate a number';
    _id := public.save_sales_document('invoice', jsonb_build_object('organization_id', _org, 'document_number', _number, 'issue_date', current_date, 'tax_display', 'separate', 'tax_rounding', 'round_down'),
      '[{"name_snapshot":"Writer","qty":1,"unit_price_snapshot":100,"tax_category":"standard_10"}]');
    assert _id is not null, 'writer can atomically create invoice and lines';
    perform public.save_sales_document('invoice', '{"subject":"Writer edit"}',
      '[{"name_snapshot":"Updated","qty":2,"unit_price_snapshot":200,"tax_category":"standard_10"}]', _id);
    assert (select total from public.invoices where id = _id) = 440, 'writer edit retains totals triggers';
    delete from public.invoices where id = _id;
    get diagnostics _count = row_count;
    assert _count = 1, 'writer can delete documents and their lines';
  end loop;

  -- Even an owner in a different organization cannot read/write this org.
  perform set_config('request.jwt.claim.sub', _other::text, true);
  assert (select count(*) from public.invoices where organization_id = _org) = 0, 'outsider cannot read documents';
  update public.invoices set subject = 'Foreign change' where id = _invoice;
  get diagnostics _count = row_count;
  assert _count = 0, 'outsider cannot update documents';
  _denied := false;
  begin
    perform public.next_document_number(_org, 'invoice', current_date);
  exception when insufficient_privilege then _denied := true; end;
  assert _denied, 'definer numbering RPC rejects other organizations';
  _denied := false;
  begin
    perform public.save_sales_document('invoice', jsonb_build_object('organization_id', _org, 'document_number', 'FOREIGN-RPC', 'issue_date', current_date, 'tax_display', 'separate', 'tax_rounding', 'round_down'),
      '[{"name_snapshot":"Foreign","qty":1,"unit_price_snapshot":100,"tax_category":"standard_10"}]');
  exception when insufficient_privilege then _denied := true; end;
  assert _denied, 'outsider cannot insert documents through the atomic RPC';

  -- The background runner still has its intended non-user numbering access.
  perform set_config('role', 'postgres', true);
  perform set_config('request.jwt.claim.sub', '', true);
  perform set_config('role', 'service_role', true);
  _number := public.next_document_number(_org, 'invoice', current_date);
  assert _number is not null, 'service-role runner can allocate a number';
  perform set_config('role', 'postgres', true);
  assert not has_function_privilege('anon', 'public.ai_estimate_claim_jobs(uuid,uuid,text,integer)', 'EXECUTE'), 'anonymous users cannot mutate jobs';
  assert not has_function_privilege('anon', 'public.ai_estimate_rebuild_price_stats(uuid)', 'EXECUTE'), 'anonymous users cannot rebuild organization data';
  assert has_function_privilege('service_role', 'public.ai_estimate_claim_jobs(uuid,uuid,text,integer)', 'EXECUTE'), 'service worker retains job RPC';
  assert has_function_privilege('service_role', 'public.ai_estimate_rebuild_price_stats(uuid)', 'EXECUTE'), 'service worker retains statistics RPC';
  raise notice 'Viewer business permission regression checks passed';
end;
$$;
rollback;
