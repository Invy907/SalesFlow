-- 0020_backfill_document_totals.sql
-- 문서 생성·수정 액션이 subtotal/tax_amount 를 채우지 않아 저장된 문서의 합계가 0으로 남았다.
-- 애플리케이션은 computeDocumentTotals() 로 고쳤고, 여기서는 기존 행을 같은 규칙으로 다시 계산한다.
--
-- 규칙(적격청구서 제도):
--   * 소계는 행별 절사 없이 합산한 뒤 한 번만 절사
--   * 세액은 세율 그룹별로 한 번만 단수처리하고, 문서의 tax_rounding 을 따른다

create or replace function public.tax_rate_for(_category public.tax_category)
returns numeric
language sql
immutable
set search_path = public
as $$
  select case _category
    when 'reduced_8'  then 0.08
    when 'standard_8' then 0.08
    when 'standard_5' then 0.05
    when 'exempt'     then 0
    else 0.1
  end;
$$;

create or replace function public.round_tax(_amount numeric, _rounding public.tax_rounding)
returns bigint
language sql
immutable
set search_path = public
as $$
  select case _rounding
    when 'round_up'   then ceil(_amount)
    when 'round_half' then round(_amount)
    else                   floor(_amount)
  end::bigint;
$$;

-- estimates
with groups as (
  select l.document_id, l.tax_category, sum(l.qty * l.unit_price_snapshot) as taxable
  from public.estimate_line_items l
  group by l.document_id, l.tax_category
), totals as (
  select
    g.document_id,
    floor(sum(g.taxable))::bigint as subtotal,
    coalesce(
      sum(public.round_tax(g.taxable * public.tax_rate_for(g.tax_category), d.tax_rounding))
        filter (where g.taxable > 0),
      0
    )::bigint as tax_amount
  from groups g
  join public.estimates d on d.id = g.document_id
  group by g.document_id
)
update public.estimates d
   set subtotal = t.subtotal, tax_amount = t.tax_amount
  from totals t
 where d.id = t.document_id
   and (d.subtotal <> t.subtotal or d.tax_amount <> t.tax_amount);

-- invoices
with groups as (
  select l.document_id, l.tax_category, sum(l.qty * l.unit_price_snapshot) as taxable
  from public.invoice_line_items l
  group by l.document_id, l.tax_category
), totals as (
  select
    g.document_id,
    floor(sum(g.taxable))::bigint as subtotal,
    coalesce(
      sum(public.round_tax(g.taxable * public.tax_rate_for(g.tax_category), d.tax_rounding))
        filter (where g.taxable > 0),
      0
    )::bigint as tax_amount
  from groups g
  join public.invoices d on d.id = g.document_id
  group by g.document_id
)
update public.invoices d
   set subtotal = t.subtotal, tax_amount = t.tax_amount
  from totals t
 where d.id = t.document_id
   and (d.subtotal <> t.subtotal or d.tax_amount <> t.tax_amount);

-- delivery_notes
with groups as (
  select l.document_id, l.tax_category, sum(l.qty * l.unit_price_snapshot) as taxable
  from public.delivery_note_line_items l
  group by l.document_id, l.tax_category
), totals as (
  select
    g.document_id,
    floor(sum(g.taxable))::bigint as subtotal,
    coalesce(
      sum(public.round_tax(g.taxable * public.tax_rate_for(g.tax_category), d.tax_rounding))
        filter (where g.taxable > 0),
      0
    )::bigint as tax_amount
  from groups g
  join public.delivery_notes d on d.id = g.document_id
  group by g.document_id
)
update public.delivery_notes d
   set subtotal = t.subtotal, tax_amount = t.tax_amount
  from totals t
 where d.id = t.document_id
   and (d.subtotal <> t.subtotal or d.tax_amount <> t.tax_amount);

-- receipts
with groups as (
  select l.document_id, l.tax_category, sum(l.qty * l.unit_price_snapshot) as taxable
  from public.receipt_line_items l
  group by l.document_id, l.tax_category
), totals as (
  select
    g.document_id,
    floor(sum(g.taxable))::bigint as subtotal,
    coalesce(
      sum(public.round_tax(g.taxable * public.tax_rate_for(g.tax_category), d.tax_rounding))
        filter (where g.taxable > 0),
      0
    )::bigint as tax_amount
  from groups g
  join public.receipts d on d.id = g.document_id
  group by g.document_id
)
update public.receipts d
   set subtotal = t.subtotal, tax_amount = t.tax_amount
  from totals t
 where d.id = t.document_id
   and (d.subtotal <> t.subtotal or d.tax_amount <> t.tax_amount);

-- orders: tax_rounding 컬럼이 없어 기본값(round_down)을 쓴다.
with groups as (
  select l.document_id, l.tax_category, sum(l.qty * l.unit_price_snapshot) as taxable
  from public.order_line_items l
  group by l.document_id, l.tax_category
), totals as (
  select
    g.document_id,
    floor(sum(g.taxable))::bigint as subtotal,
    coalesce(
      sum(public.round_tax(g.taxable * public.tax_rate_for(g.tax_category), 'round_down'))
        filter (where g.taxable > 0),
      0
    )::bigint as tax_amount
  from groups g
  group by g.document_id
)
update public.orders d
   set subtotal = t.subtotal, tax_amount = t.tax_amount
  from totals t
 where d.id = t.document_id
   and (d.subtotal <> t.subtotal or d.tax_amount <> t.tax_amount);
