-- 0010_totals_and_public_rpc.sql
-- Document total recalculation (spec 10.3) and the anon-facing token RPCs
-- (spec 7.4 / 7.5).

-- One trigger body for all five document families. TG_ARGV carries the parent
-- and line table names so the tax grouping logic exists in a single place.
-- Tax is floored per rate bucket, matching the client-side calculation.
create or replace function public.recalculate_document_totals()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  _parent text := tg_argv[0];
  _lines text := tg_argv[1];
  _doc_id uuid := coalesce(new.document_id, old.document_id);
  _subtotal bigint;
  _tax bigint;
begin
  execute format(
    'select coalesce(sum(line_subtotal), 0) from public.%I where document_id = $1',
    _lines
  ) into _subtotal using _doc_id;

  execute format(
    'select coalesce(sum(floor(g.base * g.rate)), 0)::bigint
       from (
         select tax_rate_snapshot as rate, sum(line_subtotal) as base
         from public.%I
         where document_id = $1
         group by tax_rate_snapshot
       ) g',
    _lines
  ) into _tax using _doc_id;

  execute format(
    'update public.%I set subtotal = $1, tax_amount = $2 where id = $3',
    _parent
  ) using _subtotal, _tax, _doc_id;

  return null;
end;
$$;

drop trigger if exists estimate_line_items_totals on public.estimate_line_items;
create trigger estimate_line_items_totals
  after insert or update or delete on public.estimate_line_items
  for each row execute function public.recalculate_document_totals('estimates', 'estimate_line_items');

drop trigger if exists invoice_line_items_totals on public.invoice_line_items;
create trigger invoice_line_items_totals
  after insert or update or delete on public.invoice_line_items
  for each row execute function public.recalculate_document_totals('invoices', 'invoice_line_items');

drop trigger if exists delivery_note_line_items_totals on public.delivery_note_line_items;
create trigger delivery_note_line_items_totals
  after insert or update or delete on public.delivery_note_line_items
  for each row execute function public.recalculate_document_totals('delivery_notes', 'delivery_note_line_items');

drop trigger if exists receipt_line_items_totals on public.receipt_line_items;
create trigger receipt_line_items_totals
  after insert or update or delete on public.receipt_line_items
  for each row execute function public.recalculate_document_totals('receipts', 'receipt_line_items');

drop trigger if exists order_line_items_totals on public.order_line_items;
create trigger order_line_items_totals
  after insert or update or delete on public.order_line_items
  for each row execute function public.recalculate_document_totals('orders', 'order_line_items');

-- Keeps invoices.paid_amount in step with the payments ledger so receivable
-- reports can read a single column.
create or replace function public.recalculate_invoice_paid_amount()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  _invoice_id uuid := coalesce(new.invoice_id, old.invoice_id);
  _paid bigint;
begin
  select coalesce(sum(amount), 0) into _paid
  from public.payments
  where invoice_id = _invoice_id;

  update public.invoices
  set paid_amount = _paid,
      paid_at = case when _paid >= total and total > 0 then coalesce(paid_at, now()) else null end
  where id = _invoice_id;

  return null;
end;
$$;

drop trigger if exists payments_recalculate_invoice on public.payments;
create trigger payments_recalculate_invoice
  after insert or update or delete on public.payments
  for each row execute function public.recalculate_invoice_paid_amount();

-- Anon share lookup. One entry point instead of four near-identical functions;
-- target_table is constrained by share_tokens so the dynamic name is safe.
create or replace function public.get_shared_document(_token text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  _target_table text;
  _target_id uuid;
  _line_table text;
  _doc jsonb;
  _lines jsonb;
begin
  select t.target_table, t.target_id
  into _target_table, _target_id
  from public.share_tokens t
  where t.token = _token
    and t.revoked_at is null
    and (t.expires_at is null or t.expires_at > now());

  if _target_table is null then
    return null;
  end if;

  _line_table := case _target_table
    when 'estimates' then 'estimate_line_items'
    when 'invoices' then 'invoice_line_items'
    when 'receipts' then 'receipt_line_items'
    when 'delivery_notes' then 'delivery_note_line_items'
  end;

  execute format(
    'select to_jsonb(d) from public.%I d where d.id = $1 and d.deleted_at is null',
    _target_table
  ) into _doc using _target_id;

  if _doc is null then
    return null;
  end if;

  execute format(
    'select coalesce(jsonb_agg(to_jsonb(l) order by l.line_no), ''[]''::jsonb)
       from public.%I l where l.document_id = $1',
    _line_table
  ) into _lines using _target_id;

  -- internal_memo is staff-only and must not leave through a public link.
  return jsonb_build_object(
    'type', _target_table,
    'document', _doc - 'internal_memo',
    'lines', _lines
  );
end;
$$;

revoke all on function public.get_shared_document(text) from public;
grant execute on function public.get_shared_document(text) to anon, authenticated;

create or replace function public.get_public_order_form(_token text)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'form', to_jsonb(f) - 'organization_id',
    'lines', coalesce(
      (
        select jsonb_agg(to_jsonb(li) order by li.line_no)
        from public.order_form_line_items li
        where li.order_form_id = f.id
      ),
      '[]'::jsonb
    )
  )
  from public.order_forms f
  where f.public_token = _token
    and f.is_published = true
    and f.deleted_at is null
    and (f.expiration_mode = 'none' or f.expiration_date >= current_date);
$$;

revoke all on function public.get_public_order_form(text) from public;
grant execute on function public.get_public_order_form(text) to anon, authenticated;

-- Submissions arrive from unauthenticated visitors, so they go through this
-- definer function rather than an "insert to anon" RLS policy: the form token
-- decides the organization, and the client cannot name it.
create or replace function public.submit_public_order_form(
  _token text,
  _client_name text,
  _email text,
  _phone text,
  _payload jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  _form public.order_forms;
  _submission_id uuid;
begin
  select * into _form
  from public.order_forms
  where public_token = _token
    and is_published = true
    and deleted_at is null
    and (expiration_mode = 'none' or expiration_date >= current_date);

  if _form.id is null then
    raise exception 'form_not_found';
  end if;

  if _form.client_name_required and coalesce(btrim(_client_name), '') = '' then
    raise exception 'client_name_required';
  end if;

  insert into public.order_form_submissions (
    order_form_id, organization_id, client_name_input, email_input, phone_input, payload
  )
  values (
    _form.id, _form.organization_id, _client_name, _email, _phone, _payload
  )
  returning id into _submission_id;

  return _submission_id;
end;
$$;

revoke all on function public.submit_public_order_form(text, text, text, text, jsonb) from public;
grant execute on function public.submit_public_order_form(text, text, text, text, jsonb) to anon, authenticated;
