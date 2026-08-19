-- 0005_rls_policies.sql
-- Org-scoped RLS for SalesFlow tables

alter table public.organizations enable row level security;
alter table public.profiles enable row level security;
alter table public.organization_members enable row level security;
alter table public.organization_invitations enable row level security;
alter table public.company_profiles enable row level security;
alter table public.document_defaults enable row level security;
alter table public.display_settings enable row level security;
alter table public.feature_flags enable row level security;
alter table public.bank_accounts enable row level security;
alter table public.clients enable row level security;
alter table public.client_destinations enable row level security;
alter table public.items enable row level security;
alter table public.estimates enable row level security;
alter table public.estimate_line_items enable row level security;
alter table public.invoices enable row level security;
alter table public.invoice_line_items enable row level security;
alter table public.delivery_notes enable row level security;
alter table public.delivery_note_line_items enable row level security;
alter table public.receipts enable row level security;
alter table public.receipt_line_items enable row level security;
alter table public.payments enable row level security;
alter table public.order_statuses enable row level security;
alter table public.orders enable row level security;
alter table public.order_line_items enable row level security;
alter table public.inbox_messages enable row level security;
alter table public.document_sequences enable row level security;

-- organizations
create policy organizations_select on public.organizations for select to authenticated
  using (id in (select auth_org_ids()));
create policy organizations_update on public.organizations for update to authenticated
  using (public.auth_has_role_in_org(id, array['owner','admin']::public.member_role[]))
  with check (public.auth_has_role_in_org(id, array['owner','admin']::public.member_role[]));

-- profiles
create policy profiles_self on public.profiles for all to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- organization_members
create policy organization_members_select on public.organization_members for select to authenticated
  using (organization_id in (select auth_org_ids()));
create policy organization_members_write on public.organization_members for all to authenticated
  using (public.auth_has_role_in_org(organization_id, array['owner','admin']::public.member_role[]))
  with check (public.auth_has_role_in_org(organization_id, array['owner','admin']::public.member_role[]));

-- organization_invitations
create policy organization_invitations_select on public.organization_invitations for select to authenticated
  using (organization_id in (select auth_org_ids()));
create policy organization_invitations_write on public.organization_invitations for all to authenticated
  using (public.auth_has_role_in_org(organization_id, array['owner','admin']::public.member_role[]))
  with check (public.auth_has_role_in_org(organization_id, array['owner','admin']::public.member_role[]));

-- org-owned tables (pattern A)
create policy company_profiles_org on public.company_profiles for all to authenticated
  using (organization_id in (select auth_org_ids()))
  with check (organization_id in (select auth_org_ids()));

create policy document_defaults_org on public.document_defaults for all to authenticated
  using (organization_id in (select auth_org_ids()))
  with check (organization_id in (select auth_org_ids()));

create policy display_settings_org on public.display_settings for all to authenticated
  using (organization_id in (select auth_org_ids()))
  with check (organization_id in (select auth_org_ids()));

create policy feature_flags_org on public.feature_flags for all to authenticated
  using (organization_id in (select auth_org_ids()))
  with check (organization_id in (select auth_org_ids()));

create policy bank_accounts_org on public.bank_accounts for all to authenticated
  using (organization_id in (select auth_org_ids()))
  with check (organization_id in (select auth_org_ids()));

create policy clients_org on public.clients for all to authenticated
  using (organization_id in (select auth_org_ids()))
  with check (organization_id in (select auth_org_ids()));

create policy client_destinations_org on public.client_destinations for all to authenticated
  using (client_id in (select id from public.clients where organization_id in (select auth_org_ids())));

create policy items_org on public.items for all to authenticated
  using (organization_id in (select auth_org_ids()))
  with check (organization_id in (select auth_org_ids()));

create policy estimates_org on public.estimates for all to authenticated
  using (organization_id in (select auth_org_ids()))
  with check (organization_id in (select auth_org_ids()));

create policy estimate_line_items_org on public.estimate_line_items for all to authenticated
  using (document_id in (select id from public.estimates where organization_id in (select auth_org_ids())));

create policy invoices_org on public.invoices for all to authenticated
  using (organization_id in (select auth_org_ids()))
  with check (organization_id in (select auth_org_ids()));

create policy invoice_line_items_org on public.invoice_line_items for all to authenticated
  using (document_id in (select id from public.invoices where organization_id in (select auth_org_ids())));

create policy delivery_notes_org on public.delivery_notes for all to authenticated
  using (organization_id in (select auth_org_ids()))
  with check (organization_id in (select auth_org_ids()));

create policy delivery_note_line_items_org on public.delivery_note_line_items for all to authenticated
  using (document_id in (select id from public.delivery_notes where organization_id in (select auth_org_ids())));

create policy receipts_org on public.receipts for all to authenticated
  using (organization_id in (select auth_org_ids()))
  with check (organization_id in (select auth_org_ids()));

create policy receipt_line_items_org on public.receipt_line_items for all to authenticated
  using (document_id in (select id from public.receipts where organization_id in (select auth_org_ids())));

create policy payments_org on public.payments for all to authenticated
  using (organization_id in (select auth_org_ids()))
  with check (organization_id in (select auth_org_ids()));

create policy order_statuses_org on public.order_statuses for all to authenticated
  using (organization_id in (select auth_org_ids()))
  with check (organization_id in (select auth_org_ids()));

create policy orders_org on public.orders for all to authenticated
  using (organization_id in (select auth_org_ids()))
  with check (organization_id in (select auth_org_ids()));

create policy order_line_items_org on public.order_line_items for all to authenticated
  using (document_id in (select id from public.orders where organization_id in (select auth_org_ids())));

create policy inbox_messages_org on public.inbox_messages for all to authenticated
  using (organization_id in (select auth_org_ids()));

-- document_sequences: no direct client access
revoke all on table public.document_sequences from anon, authenticated;
