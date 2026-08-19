-- 0011_rls_new_tables.sql
-- RLS for the tables added in 0008/0009, plus the co-member profile read that
-- the team settings screen needs.

alter table public.order_forms enable row level security;
alter table public.order_form_line_items enable row level security;
alter table public.order_form_submissions enable row level security;
alter table public.periodic_invoice_schedules enable row level security;
alter table public.periodic_invoice_schedule_line_items enable row level security;
alter table public.notifications enable row level security;
alter table public.usage_events enable row level security;
alter table public.audit_log enable row level security;
alter table public.share_tokens enable row level security;

create policy order_forms_org on public.order_forms for all to authenticated
  using (organization_id in (select auth_org_ids()))
  with check (organization_id in (select auth_org_ids()));

create policy order_form_line_items_org on public.order_form_line_items for all to authenticated
  using (order_form_id in (select id from public.order_forms where organization_id in (select auth_org_ids())))
  with check (order_form_id in (select id from public.order_forms where organization_id in (select auth_org_ids())));

-- Inserts come from submit_public_order_form (security definer), so members get
-- read/update only; there is no anon insert path on the table itself.
create policy order_form_submissions_select on public.order_form_submissions for select to authenticated
  using (organization_id in (select auth_org_ids()));
create policy order_form_submissions_update on public.order_form_submissions for update to authenticated
  using (organization_id in (select auth_org_ids()))
  with check (organization_id in (select auth_org_ids()));
create policy order_form_submissions_delete on public.order_form_submissions for delete to authenticated
  using (organization_id in (select auth_org_ids()));

create policy periodic_invoice_schedules_org on public.periodic_invoice_schedules for all to authenticated
  using (organization_id in (select auth_org_ids()))
  with check (organization_id in (select auth_org_ids()));

create policy periodic_invoice_schedule_line_items_org on public.periodic_invoice_schedule_line_items for all to authenticated
  using (schedule_id in (select id from public.periodic_invoice_schedules where organization_id in (select auth_org_ids())))
  with check (schedule_id in (select id from public.periodic_invoice_schedules where organization_id in (select auth_org_ids())));

-- Notifications are produced server-side; members may read and mark as read.
create policy notifications_select on public.notifications for select to authenticated
  using (
    organization_id in (select auth_org_ids())
    and (user_id is null or user_id = auth.uid())
  );
create policy notifications_update on public.notifications for update to authenticated
  using (
    organization_id in (select auth_org_ids())
    and (user_id is null or user_id = auth.uid())
  )
  with check (
    organization_id in (select auth_org_ids())
    and (user_id is null or user_id = auth.uid())
  );

-- Metering and audit rows are written by the service role only: no insert,
-- update or delete policy is defined for authenticated.
create policy usage_events_select on public.usage_events for select to authenticated
  using (organization_id in (select auth_org_ids()));

create policy audit_log_select on public.audit_log for select to authenticated
  using (organization_id in (select auth_org_ids()));

-- The token itself is the capability, so anon reads go through
-- get_shared_document(); members manage their org's tokens directly.
create policy share_tokens_org on public.share_tokens for all to authenticated
  using (organization_id in (select auth_org_ids()))
  with check (organization_id in (select auth_org_ids()));

-- Team settings joins organization_members -> profiles, which the self-only
-- policy from 0005 blocked for everyone but the caller.
create or replace function public.auth_shares_org_with(_user uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.organization_members mine
    join public.organization_members theirs
      on theirs.organization_id = mine.organization_id
    where mine.user_id = auth.uid()
      and theirs.user_id = _user
  );
$$;

revoke all on function public.auth_shares_org_with(uuid) from public, anon;
grant execute on function public.auth_shares_org_with(uuid) to authenticated;

create policy profiles_co_member_select on public.profiles for select to authenticated
  using (id = auth.uid() or public.auth_shares_org_with(id));
