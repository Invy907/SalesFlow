-- 0009_notifications_usage_audit_share.sql
-- Operational tables from spec 4.8 / 4.10.

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  kind text not null,
  title text,
  body text,
  payload jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists notifications_org_idx
  on public.notifications (organization_id, created_at desc);
create index if not exists notifications_unread_idx
  on public.notifications (organization_id, user_id) where read_at is null;

create table if not exists public.usage_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  event_date date not null,
  kind text not null,
  count int not null default 1,
  amount_jpy bigint not null default 0,
  reference_table text,
  reference_id uuid,
  created_at timestamptz not null default now()
);

create index if not exists usage_events_org_date_idx
  on public.usage_events (organization_id, event_date desc);

create table if not exists public.audit_log (
  id bigint primary key generated always as identity,
  organization_id uuid references public.organizations(id) on delete set null,
  actor_user_id uuid references auth.users(id) on delete set null,
  table_name text not null,
  row_id uuid,
  action text not null check (
    action in ('insert', 'update', 'delete', 'soft_delete', 'restore', 'issue', 'share')
  ),
  before jsonb,
  after jsonb,
  created_at timestamptz not null default now()
);

create index if not exists audit_log_org_idx
  on public.audit_log (organization_id, created_at desc);

-- The per-document share_token columns stay as the "is this shared" flag; this
-- table is what the anon lookup RPC resolves, so revocation and expiry are
-- recorded in one place across all four document types.
create table if not exists public.share_tokens (
  token text primary key,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  target_table text not null check (
    target_table in ('estimates', 'invoices', 'receipts', 'delivery_notes')
  ),
  target_id uuid not null,
  created_by uuid references auth.users(id) on delete set null,
  expires_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists share_tokens_target_idx
  on public.share_tokens (target_table, target_id);
create index if not exists share_tokens_org_idx
  on public.share_tokens (organization_id);
