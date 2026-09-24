-- Run against an isolated migrated Supabase database with psql -v ON_ERROR_STOP=1.
-- Everything, including the synthetic account, is rolled back.
begin;
insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data)
values ('00000000-0000-4000-8000-000000003201', '00000000-0000-0000-0000-000000000000',
  'authenticated', 'authenticated', 'document-audit@example.invalid', '{"full_name":"Document QA"}');
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000003201', true);
set local role authenticated;

do $$
declare
  _org uuid;
  _id uuid;
  _id2 uuid;
  _header jsonb;
  _lines jsonb;
  _bad jsonb;
  _row record;
  _failed boolean;
  _count bigint;
  _kind text;
begin
  select organization_id into _org from public.organization_members where user_id = auth.uid() limit 1;
  assert _org is not null, 'account organization exists';
  _failed := false;
  begin
    perform public.save_sales_document('invoice', jsonb_build_object(
      'organization_id', '00000000-0000-4000-8000-000000003299', 'document_number', 'QA-FOREIGN',
      'issue_date', '2026-09-22', 'tax_display', 'separate', 'tax_rounding', 'round_down'),
      '[{"name_snapshot":"Foreign","qty":1,"unit_price_snapshot":100,"tax_category":"standard_10"}]');
  exception when insufficient_privilege then _failed := true; end;
  assert _failed, 'RLS rejects cross-organization writes';

  _header := jsonb_build_object('organization_id', _org, 'document_number', 'QA-001',
    'issue_date', '2026-09-22', 'subject', 'Original subject', 'tax_display', 'separate',
    'tax_rounding', 'round_up', 'withholding_type', 'none', 'show_seal', true);
  _lines := '[{"name_snapshot":"Service","qty":1,"unit_price_snapshot":1005,"tax_category":"standard_10"}]';
  _id := public.save_sales_document('invoice', _header, _lines);
  select * into _row from public.invoices where id = _id;
  assert _row.subtotal = 1005 and _row.tax_amount = 101 and _row.total = 1106, 'round-up survives line trigger';
  assert (select tax_rate_snapshot from public.invoice_line_items where document_id = _id) = 0.1, 'authoritative rate snapshot';

  -- This failure occurs after the header update and the existing line DELETE.
  _bad := '[{"qty":2,"unit_price_snapshot":9000,"tax_category":"standard_10"}]';
  _failed := false;
  begin
    perform public.save_sales_document('invoice', _header || '{"subject":"Must roll back"}', _bad, _id);
  exception when not_null_violation then _failed := true; end;
  assert _failed, 'invalid replacement fails';
  select * into _row from public.invoices where id = _id;
  assert _row.subject = 'Original subject' and _row.total = 1106, 'header and totals roll back';
  assert (select count(*) from public.invoice_line_items where document_id = _id and name_snapshot = 'Service') = 1, 'original lines survive';

  select count(*) into _count from public.invoices;
  _failed := false;
  begin
    perform public.save_sales_document('invoice', _header || '{"document_number":"QA-BAD"}', _bad);
  exception when not_null_violation then _failed := true; end;
  assert _failed and (select count(*) from public.invoices) = _count, 'failed create leaves no orphan';

  _lines := '[{"name_snapshot":"Included","qty":1,"unit_price_snapshot":1100,"tax_category":"standard_10"}]';
  perform public.save_sales_document('invoice', _header || '{"tax_display":"included","tax_rounding":"round_down"}', _lines, _id);
  select * into _row from public.invoices where id = _id;
  assert _row.subtotal = 1100 and _row.tax_amount = 100 and _row.total = 1100, 'included tax is not added twice';
  update public.invoices set tax_display = 'exempt' where id = _id;
  select * into _row from public.invoices where id = _id;
  assert _row.tax_amount = 0 and _row.total = 1100, 'header-only tax edit recalculates lines';

  _lines := '[{"name_snapshot":"Fee","qty":1,"unit_price_snapshot":1200000,"tax_category":"standard_10"},
    {"name_snapshot":"Expense","qty":1,"unit_price_snapshot":300000,"tax_category":"standard_10","withholding_exempt_snapshot":true}]';
  perform public.save_sales_document('invoice', _header || '{"withholding_type":"with_recovery"}', _lines, _id);
  select * into _row from public.invoices where id = _id;
  assert _row.withholding_amount = 142940 and _row.total = 1507060, 'withholding brackets and exempt lines';

  _lines := '[{"name_snapshot":"Fraction","qty":0.29,"unit_price_snapshot":100,"tax_category":"standard_10"}]';
  perform public.save_sales_document('invoice', _header || '{"tax_rounding":"round_down"}', _lines, _id);
  select * into _row from public.invoices where id = _id;
  assert _row.subtotal = 29 and _row.tax_amount = 2 and _row.total = 31, 'decimal quantities exact';

  _lines := '[{"name_snapshot":"Fee","qty":1,"unit_price_snapshot":100000,"tax_category":"standard_10"},
    {"name_snapshot":"Discount","qty":1,"unit_price_snapshot":-24000,"tax_category":"standard_10"}]';
  perform public.save_sales_document('invoice', _header || '{"withholding_type":"with_recovery"}', _lines, _id);
  select * into _row from public.invoices where id = _id;
  assert _row.subtotal = 76000 and _row.tax_amount = 7600 and _row.withholding_amount = 7759 and _row.total = 75841, 'discount lines reduce tax and withholding';
  insert into public.payments(organization_id, invoice_id, amount, paid_at, method)
    values (_org, _id, 30000, '2026-09-22', 'bank'), (_org, _id, 45841, '2026-09-22', 'bank');
  select * into _row from public.invoices where id = _id;
  assert _row.paid_amount = 75841 and _row.paid_at is not null, 'payment ledger owns paid aggregate';
  assert _row.payment_marked_at is null, 'manual badge remains independent of actual payments';
  delete from public.payments where invoice_id = _id;
  assert (select paid_amount from public.invoices where id = _id) = 0, 'deleting payments recalculates ledger';
  _lines := '[{"name_snapshot":"Fraction","qty":0.29,"unit_price_snapshot":100,"tax_category":"standard_10"}]';

  foreach _kind in array array['estimate','receipt','delivery_note'] loop
    _id2 := public.save_sales_document(_kind, _header || jsonb_build_object('document_number', 'QA-' || _kind), _lines);
    assert _id2 is not null, 'all document kinds save';
    perform public.save_sales_document(_kind, _header || jsonb_build_object('document_number', 'QA-' || _kind, 'show_seal', false), _lines, _id2);
    if _kind = 'estimate' then
      assert (select show_seal from public.estimates where id = _id2) = false, 'seal choice persists on edit';
    end if;
  end loop;
  _id2 := public.save_sales_document('delivery_note', _header || '{"document_number":"QA-DEFER","tax_display":"separate_on_invoice"}', _lines);
  select * into _row from public.delivery_notes where id = _id2;
  assert _row.tax_amount = 0 and _row.total = 29, 'delivery tax deferred until invoice';

  update public.invoices set deleted_at = now() where id = _id;
  _failed := false;
  begin
    perform public.save_sales_document('invoice', _header, _lines, _id);
  exception when others then _failed := sqlerrm = 'Document not found'; end;
  assert _failed, 'trashed documents cannot be edited';

  _failed := false;
  begin
    perform public.save_sales_document('invoice', _header, '[{"name_snapshot":" ","qty":0,"unit_price_snapshot":0,"tax_category":"standard_10"}]');
  exception when others then _failed := sqlerrm = 'At least one line item is required'; end;
  assert _failed, 'blank-only document rejected';
  raise notice 'Document transaction and tax regression checks passed';
end;
$$;
rollback;
