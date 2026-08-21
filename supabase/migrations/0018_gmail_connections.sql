-- Gmail OAuth connections (one active connection per organization, MVP).

create table if not exists public.gmail_connections (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null unique references public.organizations(id) on delete cascade,
  connected_by uuid not null references auth.users(id),
  google_email text not null,
  refresh_token_enc text not null,
  access_token_enc text,
  token_expires_at timestamptz,
  history_id text,
  last_sync_at timestamptz,
  last_sync_error text,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists gmail_connections_active_idx
  on public.gmail_connections (organization_id)
  where revoked_at is null;

-- Prevent duplicate Gmail messages per org when syncing.
create unique index if not exists inbox_messages_gmail_dedup_idx
  on public.inbox_messages (organization_id, ((payload->>'gmailMessageId')))
  where (payload->>'source') = 'gmail'
    and (payload->>'gmailMessageId') is not null;

alter table public.gmail_connections enable row level security;

create policy gmail_connections_select on public.gmail_connections
  for select to authenticated
  using (organization_id in (select public.auth_org_ids()));

create policy gmail_connections_insert on public.gmail_connections
  for insert to authenticated
  with check (
    organization_id in (select public.auth_org_ids())
    and connected_by = (select auth.uid())
    and (
      public.auth_has_role_in_org(organization_id, array['owner','admin']::public.member_role[])
      or connected_by = (select auth.uid())
    )
  );

create policy gmail_connections_update on public.gmail_connections
  for update to authenticated
  using (
    organization_id in (select public.auth_org_ids())
    and (
      connected_by = (select auth.uid())
      or public.auth_has_role_in_org(organization_id, array['owner','admin']::public.member_role[])
    )
  )
  with check (
    organization_id in (select public.auth_org_ids())
    and (
      connected_by = (select auth.uid())
      or public.auth_has_role_in_org(organization_id, array['owner','admin']::public.member_role[])
    )
  );

create policy gmail_connections_delete on public.gmail_connections
  for delete to authenticated
  using (
    organization_id in (select public.auth_org_ids())
    and (
      connected_by = (select auth.uid())
      or public.auth_has_role_in_org(organization_id, array['owner','admin']::public.member_role[])
    )
  );

grant select, insert, update, delete on public.gmail_connections to authenticated;
