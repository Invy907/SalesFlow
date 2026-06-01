-- Extensions
create extension if not exists citext;
create extension if not exists pgcrypto;

-- Enums
create type public.tax_category as enum (
  'follow_company', 'standard_10', 'reduced_8', 'standard_8', 'exempt', 'standard_5'
);
create type public.tax_display_mode as enum (
  'separate', 'separate_on_invoice', 'included', 'exempt'
);
create type public.tax_rounding as enum (
  'round_down', 'round_up', 'round_half'
);
create type public.withholding_type as enum (
  'none', 'with_recovery', 'without_recovery'
);
create type public.document_status as enum (
  'draft', 'issued', 'sent', 'confirmed', 'overdue', 'trashed'
);
create type public.periodic_cycle as enum (
  'monthly', 'yearly', 'weekly'
);
create type public.payment_option as enum (
  'none', 'card_plus', 'deferred_plus'
);
create type public.order_system_status as enum (
  'unprocessed', 'processed', 'trash'
);
create type public.member_role as enum (
  'owner', 'admin', 'member', 'viewer'
);
create type public.plan_tier as enum (
  'free_trial', 'starter', 'standard', 'pro'
);

-- updated_at auto-trigger function
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Helper: orgs the current user belongs to
create or replace function public.auth_org_ids()
returns setof uuid
language plpgsql stable
security definer set search_path = public
as $$
begin
  return query
    select organization_id
    from public.organization_members
    where user_id = auth.uid();
end;
$$;

-- Helper: role check
create or replace function public.auth_has_role_in_org(_org uuid, _roles public.member_role[])
returns boolean
language plpgsql stable
security definer set search_path = public
as $$
begin
  return exists (
    select 1 from public.organization_members
    where organization_id = _org and user_id = auth.uid() and role = any(_roles)
  );
end;
$$;
