-- Keep persisted totals, previews, and edits consistent. PostgreSQL 17 is required
-- by supabase/config.toml; SET EXPRESSION preserves dependent views and columns.
begin;

alter table public.estimates add column withholding_amount bigint not null default 0;
alter table public.invoices add column withholding_amount bigint not null default 0;
alter table public.delivery_notes add column withholding_amount bigint not null default 0;
alter table public.receipts add column withholding_amount bigint not null default 0;

alter table public.estimates alter column total set expression as (
  subtotal + case when tax_display in ('included', 'exempt') then 0 else tax_amount end - withholding_amount
);
alter table public.invoices alter column total set expression as (
  subtotal + case when tax_display in ('included', 'exempt') then 0 else tax_amount end - withholding_amount
);
alter table public.delivery_notes alter column total set expression as (
  subtotal + case when tax_display in ('included', 'exempt', 'separate_on_invoice') then 0 else tax_amount end - withholding_amount
);
alter table public.receipts alter column total set expression as (
  subtotal + case when tax_display in ('included', 'exempt') then 0 else tax_amount end - withholding_amount
);

create function public.calculate_sales_document_totals(
  _lines jsonb,
  _display public.tax_display_mode,
  _rounding public.tax_rounding,
  _withholding public.withholding_type,
  _kind text
) returns table (subtotal bigint, tax_amount bigint, withholding_amount bigint)
language sql immutable set search_path = public as $$
  with lines as (
    select (l->>'qty')::numeric * (l->>'unit_price_snapshot')::numeric as amount,
      case when l->>'tax_category' = 'follow_company' then 'standard_10'
        else l->>'tax_category' end::public.tax_category as category,
      coalesce((l->>'withholding_exempt_snapshot')::boolean, false) as withholding_exempt
    from jsonb_array_elements(coalesce(_lines, '[]'::jsonb)) l
  ), buckets as (
    select public.tax_rate_for(category) as rate, sum(amount) as amount from lines group by public.tax_rate_for(category)
  ), amounts as (
    select coalesce(sum(amount), 0) as base,
      greatest(coalesce(sum(amount) filter (where not withholding_exempt), 0), 0) as eligible
    from lines
  )
  select floor(a.base)::bigint,
    case when _display = 'exempt' or (_display = 'separate_on_invoice' and _kind = 'delivery_note') then 0
      else coalesce((select sum(public.round_tax(
        b.amount * b.rate /
          case when _display = 'included' then 1 + b.rate else 1 end,
        _rounding)) from buckets b where b.amount <> 0), 0)::bigint end,
    case when _withholding = 'none' then 0 else floor(
      (least(a.eligible, 1000000) + greatest(a.eligible - 1000000, 0) * 2) *
      case when _withholding = 'with_recovery' then 0.1021 else 0.1 end
    )::bigint end
  from amounts a;
$$;
revoke all on function public.calculate_sales_document_totals(jsonb, public.tax_display_mode, public.tax_rounding, public.withholding_type, text) from public, anon, authenticated;

-- Serialize recalculation on the parent row. Decimal quantities are summed
-- before rounding, and the saved rounding/mode settings are respected.
create or replace function public.recalculate_document_totals()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  _parent text := tg_argv[0];
  _line_table text := tg_argv[1];
  _id uuid := coalesce(new.document_id, old.document_id);
  _document jsonb;
  _lines jsonb;
  _totals record;
  _kind text;
begin
  execute format('select to_jsonb(d) from public.%I d where id = $1 for update', _parent)
    into _document using _id;
  if _document is null then return null; end if;
  execute format('select coalesce(jsonb_agg(to_jsonb(l)), ''[]''::jsonb) from public.%I l where document_id = $1', _line_table)
    into _lines using _id;
  _kind := case _parent when 'delivery_notes' then 'delivery_note' else rtrim(_parent, 's') end;
  select * into _totals from public.calculate_sales_document_totals(
    _lines, coalesce((_document->>'tax_display')::public.tax_display_mode, 'separate'),
    coalesce((_document->>'tax_rounding')::public.tax_rounding, 'round_down'),
    coalesce((_document->>'withholding_type')::public.withholding_type, 'none'), _kind);
  if _parent = 'orders' then
    execute format('update public.%I set subtotal = $1, tax_amount = $2 where id = $3', _parent)
      using _totals.subtotal, _totals.tax_amount, _id;
  else
    execute format('update public.%I set subtotal = $1, tax_amount = $2, withholding_amount = $3 where id = $4', _parent)
      using _totals.subtotal, _totals.tax_amount, _totals.withholding_amount, _id;
  end if;
  return null;
end;
$$;

-- Changing only a tax setting must also recalculate the unchanged line items.
create function public.recalculate_document_tax_settings()
returns trigger language plpgsql security definer set search_path = public as $$
declare _lines jsonb; _totals record;
begin
  execute format('select coalesce(jsonb_agg(to_jsonb(l)), ''[]''::jsonb) from public.%I l where document_id = $1', tg_argv[0])
    into _lines using new.id;
  select * into _totals from public.calculate_sales_document_totals(
    _lines, new.tax_display, new.tax_rounding, new.withholding_type, tg_argv[1]);
  new.subtotal := _totals.subtotal;
  new.tax_amount := _totals.tax_amount;
  new.withholding_amount := _totals.withholding_amount;
  return new;
end;
$$;
revoke all on function public.recalculate_document_tax_settings() from public, anon, authenticated;
create trigger estimates_tax_settings before update of tax_display, tax_rounding, withholding_type on public.estimates
  for each row execute function public.recalculate_document_tax_settings('estimate_line_items', 'estimate');
create trigger invoices_tax_settings before update of tax_display, tax_rounding, withholding_type on public.invoices
  for each row execute function public.recalculate_document_tax_settings('invoice_line_items', 'invoice');
create trigger delivery_notes_tax_settings before update of tax_display, tax_rounding, withholding_type on public.delivery_notes
  for each row execute function public.recalculate_document_tax_settings('delivery_note_line_items', 'delivery_note');
create trigger receipts_tax_settings before update of tax_display, tax_rounding, withholding_type on public.receipts
  for each row execute function public.recalculate_document_tax_settings('receipt_line_items', 'receipt');

-- Repair existing totals with the same trigger that will handle future changes.
update public.estimates set tax_rounding = tax_rounding;
update public.invoices set tax_rounding = tax_rounding;
update public.delivery_notes set tax_rounding = tax_rounding;
update public.receipts set tax_rounding = tax_rounding;

-- Never overwrite the ledger aggregate with a stale application read.
create or replace function public.recalculate_invoice_paid_amount()
returns trigger language plpgsql security definer set search_path = public as $$
declare _id uuid; _paid bigint;
begin
  for _id in select distinct id from unnest(array[
    case when tg_op <> 'DELETE' then new.invoice_id end,
    case when tg_op <> 'INSERT' then old.invoice_id end
  ]) id where id is not null order by id loop
    perform 1 from public.invoices where id = _id for update;
    select coalesce(sum(amount), 0) into _paid from public.payments where invoice_id = _id;
    update public.invoices set paid_amount = _paid,
      paid_at = case when _paid >= total and total > 0 then coalesce(paid_at, now()) else null end
      where id = _id;
  end loop;
  return null;
end;
$$;

-- A single invoker transaction saves both the header and its complete lines.
-- Any failure rolls everything back, and ordinary membership/role RLS applies.
create function public.save_sales_document(
  _kind text, _document jsonb, _lines jsonb, _id uuid default null
) returns uuid language plpgsql security invoker set search_path = public as $$
declare
  _table text;
  _line_table text;
  _org uuid;
  _columns text;
  _key text;
  _saved uuid;
  _allowed text[] := array[
    'organization_id', 'client_id', 'client_destination_id', 'document_number', 'subject', 'issue_date',
    'tax_display', 'tax_rounding', 'withholding_type', 'template_key', 'output_locale', 'client_honorific',
    'show_seal', 'show_client_honorific', 'template_message', 'remarks', 'internal_memo',
    'recipient_snapshot', 'sender_snapshot'
  ];
begin
  if auth.uid() is null then raise exception 'Unauthorized' using errcode = '42501'; end if;
  case _kind
    when 'estimate' then _table := 'estimates'; _line_table := 'estimate_line_items'; _allowed := _allowed || array['expiry_date'];
    when 'invoice' then _table := 'invoices'; _line_table := 'invoice_line_items'; _allowed := _allowed || array['payment_due', 'delivery_date', 'billing_month', 'bank_account_ids'];
    when 'delivery_note' then _table := 'delivery_notes'; _line_table := 'delivery_note_line_items'; _allowed := _allowed || array['delivery_date', 'linked_invoice_id'];
    when 'receipt' then _table := 'receipts'; _line_table := 'receipt_line_items'; _allowed := _allowed || array['transaction_date', 'linked_invoice_id'];
    else raise exception 'Invalid document type';
  end case;
  if jsonb_typeof(_document) is distinct from 'object' or jsonb_typeof(_lines) is distinct from 'array' then
    raise exception 'Invalid document input';
  end if;
  if jsonb_array_length(_lines) < 1 or jsonb_array_length(_lines) > 80 then raise exception 'Invalid line count'; end if;
  if not exists(select 1 from jsonb_array_elements(_lines) l where
    coalesce(btrim(l->>'name_snapshot'), '') <> '' or coalesce((l->>'qty')::numeric, 0) <> 0 or coalesce((l->>'unit_price_snapshot')::numeric, 0) <> 0
  ) then raise exception 'At least one line item is required'; end if;
  if exists(select 1 from jsonb_array_elements(_lines) l where
    (l->>'qty')::numeric < 0 or (l->>'qty')::numeric <> round((l->>'qty')::numeric, 4)
    or (l->>'unit_price_snapshot')::numeric <> trunc((l->>'unit_price_snapshot')::numeric)
  ) then raise exception 'Invalid line amount'; end if;
  if (select coalesce(sum((l->>'qty')::numeric * (l->>'unit_price_snapshot')::numeric), 0) from jsonb_array_elements(_lines) l) < 0 then
    raise exception 'Document subtotal cannot be negative';
  end if;

  for _key in select jsonb_object_keys(_document) loop
    if not (_key = any(_allowed)) then raise exception 'Invalid document field: %', _key; end if;
  end loop;
  if _id is not null then
    execute format('select organization_id from public.%I where id = $1 and deleted_at is null for update', _table)
      into _org using _id;
    if _org is null then raise exception 'Document not found'; end if;
    -- A caller cannot move a document to another organization.
    if _document ? 'organization_id' and (_document->>'organization_id')::uuid <> _org then raise exception 'Organization mismatch'; end if;
    _document := _document - 'organization_id';
  else
    _org := (_document->>'organization_id')::uuid;
    _document := _document || jsonb_build_object('created_by', auth.uid());
  end if;
  if _org is null then raise exception 'Organization is required'; end if;

  if _document->>'client_id' is not null and not exists (
    select 1 from public.clients where id = (_document->>'client_id')::uuid and organization_id = _org and deleted_at is null
  ) then raise exception 'Client not found'; end if;
  if _document->>'client_destination_id' is not null and not exists (
    select 1 from public.client_destinations where id = (_document->>'client_destination_id')::uuid and client_id = (_document->>'client_id')::uuid
  ) then raise exception 'Client destination not found'; end if;
  if _document->>'linked_invoice_id' is not null and not exists (
    select 1 from public.invoices where id = (_document->>'linked_invoice_id')::uuid and organization_id = _org and deleted_at is null
  ) then raise exception 'Linked invoice not found'; end if;
  if exists (select 1 from jsonb_array_elements(_lines) l where l->>'item_id' is not null and not exists (
    select 1 from public.items i where i.id = (l->>'item_id')::uuid and i.organization_id = _org and i.deleted_at is null
  )) then raise exception 'Item not found'; end if;
  if _document->'bank_account_ids' is not null and _document->'bank_account_ids' <> 'null'::jsonb then
    if jsonb_array_length(_document->'bank_account_ids') > 3 or exists (
      select 1 from jsonb_array_elements_text(_document->'bank_account_ids') b where not exists (
        select 1 from public.bank_accounts where id = b::uuid and organization_id = _org
      )
    ) then raise exception 'Bank account not found'; end if;
  end if;

  select string_agg(format('%I', k), ', ' order by k) into _columns from jsonb_object_keys(_document) k;
  if _id is null then
    execute format('insert into public.%I (%s) select %s from jsonb_populate_record(null::public.%I, $1) returning id', _table, _columns, _columns, _table)
      into _saved using _document;
  else
    execute format('update public.%I set (%s) = (select %s from jsonb_populate_record(null::public.%I, $1)) where id = $2 and deleted_at is null returning id', _table, _columns, _columns, _table)
      into _saved using _document, _id;
    if _saved is null then raise exception 'Document not found or not editable'; end if;
    execute format('delete from public.%I where document_id = $1', _line_table) using _saved;
  end if;
  execute format(
    'insert into public.%I (document_id, line_no, item_id, name_snapshot, qty, unit_snapshot, unit_price_snapshot, tax_category, tax_rate_snapshot, withholding_exempt_snapshot)
     select $1, n::smallint, (l->>''item_id'')::uuid, l->>''name_snapshot'', (l->>''qty'')::numeric, l->>''unit_snapshot'',
       (l->>''unit_price_snapshot'')::bigint, (l->>''tax_category'')::public.tax_category,
       public.tax_rate_for((l->>''tax_category'')::public.tax_category), coalesce((l->>''withholding_exempt_snapshot'')::boolean, false)
     from jsonb_array_elements($2) with ordinality as input(l, n)', _line_table)
    using _saved, _lines;
  return _saved;
end;
$$;
revoke all on function public.save_sales_document(text, jsonb, jsonb, uuid) from public, anon;
grant execute on function public.save_sales_document(text, jsonb, jsonb, uuid) to authenticated;

commit;
