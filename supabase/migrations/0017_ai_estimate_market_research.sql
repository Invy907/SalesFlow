-- 0017_ai_estimate_market_research.sql
-- Optional, explicitly enabled public market-price research.

alter table public.ai_estimate_settings
  add column if not exists allow_web_market_research boolean not null default false;

create table public.ai_estimate_market_research_runs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  requested_by uuid not null references auth.users(id) on delete restrict,
  suggestion_id uuid references public.ai_estimate_suggestions(id) on delete set null,
  public_query text not null,
  country_code text not null check (country_code in ('JP', 'KR', 'US', 'GLOBAL')),
  currency text not null check (currency in ('JPY', 'KRW', 'USD')),
  result_data jsonb,
  provider text,
  model text,
  status text not null check (status in ('completed', 'failed')),
  error_message text,
  created_at timestamptz not null default now()
);

create index ai_estimate_market_research_org_created_idx
  on public.ai_estimate_market_research_runs (organization_id, created_at desc);

alter table public.ai_estimate_market_research_runs enable row level security;

create policy ai_estimate_market_research_select on public.ai_estimate_market_research_runs
  for select to authenticated
  using (
    organization_id in (select public.auth_org_ids())
    and (
      requested_by = (select auth.uid())
      or public.auth_has_role_in_org(organization_id, array['owner','admin']::public.member_role[])
    )
  );

create policy ai_estimate_market_research_insert on public.ai_estimate_market_research_runs
  for insert to authenticated
  with check (
    organization_id in (select public.auth_org_ids())
    and requested_by = (select auth.uid())
  );

grant select, insert on public.ai_estimate_market_research_runs to authenticated;
grant select, insert, update, delete on public.ai_estimate_market_research_runs to service_role;
