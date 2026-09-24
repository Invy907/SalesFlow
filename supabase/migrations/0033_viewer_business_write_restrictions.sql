-- Viewers retain existing reads, but cannot mutate organization business data.
-- Restrictive policies compose with the existing policies: they cannot broaden
-- admin-only or author-only permissions. Personal profiles and notification
-- read markers deliberately retain their current behavior.
begin;

do $$
declare
  _table text;
  _guard text := 'public.auth_has_role_in_org(organization_id, array[''owner'',''admin'',''member'']::public.member_role[])';
begin
  foreach _table in array array[
    'company_profiles', 'document_defaults', 'display_settings', 'feature_flags',
    'bank_accounts', 'clients', 'items', 'estimates', 'invoices', 'delivery_notes',
    'receipts', 'payments', 'order_statuses', 'orders', 'inbox_messages',
    'order_forms', 'order_form_submissions', 'periodic_invoice_schedules',
    'share_tokens', 'invoice_status_events', 'gmail_connections',
    'ai_estimate_sources', 'ai_estimate_extractions', 'ai_estimate_suggestions',
    'ai_estimate_market_research_runs', 'ai_estimate_review_edits'
  ] loop
    execute format('create policy business_writer_insert on public.%I as restrictive for insert to authenticated with check (%s)', _table, _guard);
    execute format('create policy business_writer_update on public.%I as restrictive for update to authenticated using (%s) with check (%s)', _table, _guard, _guard);
    execute format('create policy business_writer_delete on public.%I as restrictive for delete to authenticated using (%s)', _table, _guard);
  end loop;
end;
$$;

-- Child rows must be protected directly, not only when their parent is saved.
-- This also checks the new parent when a caller tries to move an existing row.
do $$
declare _row record; _guard text;
begin
  for _row in select * from (values
    ('client_destinations', 'client_id', 'clients'),
    ('estimate_line_items', 'document_id', 'estimates'),
    ('invoice_line_items', 'document_id', 'invoices'),
    ('delivery_note_line_items', 'document_id', 'delivery_notes'),
    ('receipt_line_items', 'document_id', 'receipts'),
    ('order_line_items', 'document_id', 'orders'),
    ('order_form_line_items', 'order_form_id', 'order_forms'),
    ('periodic_invoice_schedule_line_items', 'schedule_id', 'periodic_invoice_schedules')
  ) as relations(child_table, parent_key, parent_table) loop
    _guard := format('exists (select 1 from public.%I parent where parent.id = %I.%I and public.auth_has_role_in_org(parent.organization_id, array[''owner'',''admin'',''member'']::public.member_role[]))',
      _row.parent_table, _row.child_table, _row.parent_key);
    execute format('create policy business_writer_insert on public.%I as restrictive for insert to authenticated with check (%s)', _row.child_table, _guard);
    execute format('create policy business_writer_update on public.%I as restrictive for update to authenticated using (%s) with check (%s)', _row.child_table, _guard, _guard);
    execute format('create policy business_writer_delete on public.%I as restrictive for delete to authenticated using (%s)', _row.child_table, _guard);
  end loop;
end;
$$;

-- Existing bucket-specific policies still decide which files can be accessed.
-- The additional restriction only removes viewer mutation of organization files.
create policy business_writer_insert on storage.objects as restrictive for insert to authenticated
with check (
  case when bucket_id in ('org-logos', 'org-seals', 'csv-imports', 'document-assets', 'order-form-logos', 'ai-estimate-sources')
    then public.auth_has_role_in_org((storage.foldername(name))[1]::uuid, array['owner','admin','member']::public.member_role[])
    else true end
);
create policy business_writer_update on storage.objects as restrictive for update to authenticated
using (
  case when bucket_id in ('org-logos', 'org-seals', 'csv-imports', 'document-assets', 'order-form-logos', 'ai-estimate-sources')
    then public.auth_has_role_in_org((storage.foldername(name))[1]::uuid, array['owner','admin','member']::public.member_role[])
    else true end
)
with check (
  case when bucket_id in ('org-logos', 'org-seals', 'csv-imports', 'document-assets', 'order-form-logos', 'ai-estimate-sources')
    then public.auth_has_role_in_org((storage.foldername(name))[1]::uuid, array['owner','admin','member']::public.member_role[])
    else true end
);
create policy business_writer_delete on storage.objects as restrictive for delete to authenticated
using (
  case when bucket_id in ('org-logos', 'org-seals', 'csv-imports', 'document-assets', 'order-form-logos', 'ai-estimate-sources')
    then public.auth_has_role_in_org((storage.foldername(name))[1]::uuid, array['owner','admin','member']::public.member_role[])
    else true end
);

-- Numbering is SECURITY DEFINER and therefore must enforce its own scope.
-- Keep service_role access for the scheduled invoice runner (0023).
create or replace function public.next_document_number(
  _org uuid,
  _doc_type text,
  _issue_date date
) returns text
language plpgsql security definer set search_path = public
as $$
declare
  _rule     text;
  _scope    text := 'M';
  _digits   int  := 3;
  _date_key text;
  _seq      int;
  _lock_key bigint;
  _m        text[];
begin
  if current_setting('role', true) is distinct from 'service_role'
    and not public.auth_has_role_in_org(_org, array['owner','admin','member']::public.member_role[]) then
    raise exception 'Document write permission required' using errcode = '42501';
  end if;

  select coalesce(numbering_rule, '{Y}{M}{D}-{連番:M,3}')
    into _rule
    from public.document_defaults
   where organization_id = _org;

  _rule := coalesce(_rule, '{Y}{M}{D}-{連番:M,3}');

  _m := regexp_match(_rule, '\{[^{}:]+:([YMDA]),(\d+)\}');
  if _m is not null then
    _scope  := _m[1];
    _digits := greatest(1, least(9, _m[2]::int));
  end if;

  _date_key := case _scope
    when 'Y' then to_char(_issue_date, 'YYYY')
    when 'M' then to_char(_issue_date, 'YYYYMM')
    when 'D' then to_char(_issue_date, 'YYYYMMDD')
    else '-'
  end;

  _lock_key := hashtextextended(_org::text || _doc_type || _date_key, 0);
  perform pg_advisory_xact_lock(_lock_key);

  insert into public.document_sequences (organization_id, doc_type, date_key, last_seq)
  values (_org, _doc_type, _date_key, 1)
  on conflict (organization_id, doc_type, date_key)
  do update set last_seq = public.document_sequences.last_seq + 1
  returning last_seq into _seq;

  return regexp_replace(
    replace(
      replace(
        replace(_rule, '{Y}', to_char(_issue_date, 'YYYY')),
        '{M}', to_char(_issue_date, 'MM')),
      '{D}', to_char(_issue_date, 'DD')),
    '\{[^{}:]+:[YMDA],\d+\}',
    lpad(_seq::text, _digits, '0')
  );
end;
$$;

revoke all on function public.next_document_number(uuid, text, date) from public, anon;
grant execute on function public.next_document_number(uuid, text, date) to authenticated, service_role;

-- 0019 intended these mutation RPCs to be service-role only, but did not revoke
-- the explicit anon grants created by Supabase's default privileges.
revoke all on function public.ai_estimate_claim_jobs(uuid, uuid, text, integer) from public, anon, authenticated;
revoke all on function public.ai_estimate_rebuild_price_stats(uuid) from public, anon, authenticated;
grant execute on function public.ai_estimate_claim_jobs(uuid, uuid, text, integer) to service_role;
grant execute on function public.ai_estimate_rebuild_price_stats(uuid) to service_role;
-- This helper is only called by its trigger; a client does not need EXECUTE.
revoke all on function public.ai_estimate_create_job_for_source() from public, anon, authenticated;

commit;
