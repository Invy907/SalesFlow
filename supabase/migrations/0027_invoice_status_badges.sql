-- 請求書一覧の「発行」「入金」ステータスバッジ用フラグ + 変更履歴。
-- 既存の status(draft/issued/sent/confirmed/overdue) は未処理/処理済みタブの分類に
-- 使われており中間状態も持つため、タブとは独立した単純な2状態トグル用に
-- 別カラムを設ける(見積書の issue_marked_at と同じスタイル。0026_estimate_status_axes.sql参照)。
alter table public.invoices
  add column if not exists issued_marked_at timestamptz,
  add column if not exists payment_marked_at timestamptz;

-- 依頼2 5): 発行/入金/処理済みステータスの変更履歴。
create table if not exists public.invoice_status_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  invoice_id uuid not null references public.invoices(id) on delete cascade,
  status_type text not null check (status_type in ('issue', 'payment', 'processed')),
  previous_value text,
  new_value text not null,
  source text not null default 'manual',
  changed_by uuid references auth.users(id),
  changed_at timestamptz not null default now()
);
create index if not exists invoice_status_events_invoice_idx
  on public.invoice_status_events(invoice_id, changed_at desc);

alter table public.invoice_status_events enable row level security;
create policy invoice_status_events_org on public.invoice_status_events for all to authenticated
  using (organization_id in (select auth_org_ids()))
  with check (organization_id in (select auth_org_ids()));
