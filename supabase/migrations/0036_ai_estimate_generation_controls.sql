begin;

alter table public.ai_estimate_settings
  add column allow_external_processing boolean not null default false,
  add column daily_generation_limit integer not null default 100
    check (daily_generation_limit between 1 and 1000);

-- Suggestions can contain private source excerpts and customer instructions.
-- Sharing an organization does not grant access to another user's AI session.
create policy ai_suggestion_owner_select on public.ai_estimate_suggestions as restrictive
  for select to authenticated using (requested_by = auth.uid());
create policy ai_suggestion_owner_insert on public.ai_estimate_suggestions as restrictive
  for insert to authenticated with check (requested_by = auth.uid());
create policy ai_suggestion_owner_update on public.ai_estimate_suggestions as restrictive
  for update to authenticated using (requested_by = auth.uid()) with check (requested_by = auth.uid());
create policy ai_suggestion_owner_delete on public.ai_estimate_suggestions as restrictive
  for delete to authenticated using (requested_by = auth.uid());

create table public.ai_estimate_generation_requests (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  requested_by uuid not null references public.profiles(id) on delete cascade,
  request_key uuid not null,
  fingerprint text not null check (length(fingerprint) = 64),
  status text not null default 'running' check (status in ('running','succeeded','failed')),
  suggestion_id uuid references public.ai_estimate_suggestions(id) on delete set null,
  error_code text,
  created_at timestamptz not null default now(),
  finished_at timestamptz,
  unique (organization_id, requested_by, request_key)
);
create index ai_generation_requests_usage on public.ai_estimate_generation_requests (organization_id, created_at);
alter table public.ai_estimate_generation_requests enable row level security;
create policy ai_generation_requests_own on public.ai_estimate_generation_requests for select to authenticated
  using (requested_by = auth.uid() and organization_id in (select public.auth_org_ids()));
revoke all on public.ai_estimate_generation_requests from anon, authenticated;
grant select on public.ai_estimate_generation_requests to authenticated;
grant all on public.ai_estimate_generation_requests to service_role;

create function public.ai_estimate_begin_generation(p_organization_id uuid, p_request_key uuid, p_fingerprint text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare _row public.ai_estimate_generation_requests; _limit integer; _enabled boolean; _day_start timestamptz;
begin
  if not public.auth_has_role_in_org(p_organization_id, array['owner','admin','member']::public.member_role[]) then
    raise exception 'AI_WRITE_REQUIRED' using errcode = '42501';
  end if;
  if p_request_key is null or p_fingerprint is null or p_fingerprint !~ '^[a-f0-9]{64}$' then raise exception 'AI_INVALID_REQUEST'; end if;
  perform pg_advisory_xact_lock(hashtextextended(p_organization_id::text || ':ai-generation', 0));
  update public.ai_estimate_generation_requests set status = 'failed', error_code = 'TIMEOUT', finished_at = now()
    where organization_id = p_organization_id and status = 'running' and created_at < now() - interval '3 minutes';
  select * into _row from public.ai_estimate_generation_requests
    where organization_id = p_organization_id and requested_by = auth.uid() and request_key = p_request_key;
  if _row.id is not null then
    if _row.fingerprint <> p_fingerprint then raise exception 'AI_REQUEST_CHANGED'; end if;
    return jsonb_build_object('id', _row.id, 'status', _row.status, 'suggestionId', _row.suggestion_id);
  end if;
  select enabled, daily_generation_limit into _enabled, _limit from public.ai_estimate_settings where organization_id = p_organization_id;
  if _enabled is false then raise exception 'AI_DISABLED'; end if;
  if exists(select 1 from public.ai_estimate_generation_requests where organization_id = p_organization_id
      and requested_by = auth.uid() and status = 'running') then raise exception 'AI_REQUEST_RUNNING'; end if;
  _day_start := date_trunc('day', now() at time zone 'Asia/Tokyo') at time zone 'Asia/Tokyo';
  if (select count(*) from public.ai_estimate_generation_requests where organization_id = p_organization_id and created_at >= _day_start) >= coalesce(_limit, 100) then
    raise exception 'AI_DAILY_LIMIT';
  end if;
  insert into public.ai_estimate_generation_requests(organization_id, requested_by, request_key, fingerprint)
    values(p_organization_id, auth.uid(), p_request_key, p_fingerprint) returning * into _row;
  return jsonb_build_object('id', _row.id, 'status', 'started', 'suggestionId', null);
end;
$$;

create function public.ai_estimate_finish_generation(p_request_id uuid, p_suggestion_id uuid default null)
returns void language plpgsql security definer set search_path = public as $$
declare _row public.ai_estimate_generation_requests;
begin
  select * into _row from public.ai_estimate_generation_requests
    where id = p_request_id and requested_by = auth.uid() for update;
  if _row.id is null or not public.auth_has_role_in_org(_row.organization_id, array['owner','admin','member']::public.member_role[]) then
    raise exception 'AI_WRITE_REQUIRED' using errcode = '42501';
  end if;
  if _row.status = 'succeeded' then
    if p_suggestion_id is not distinct from _row.suggestion_id then return; end if;
    raise exception 'AI_REQUEST_FINISHED';
  end if;
  if _row.status = 'failed' then
    if p_suggestion_id is null then return; end if;
    if _row.error_code = 'TIMEOUT' then raise exception 'AI_REQUEST_EXPIRED'; end if;
    raise exception 'AI_REQUEST_FINISHED';
  end if;
  if p_suggestion_id is not null and _row.created_at < now() - interval '3 minutes' then
    raise exception 'AI_REQUEST_EXPIRED';
  end if;
  if p_suggestion_id is not null and not exists(select 1 from public.ai_estimate_suggestions
      where id = p_suggestion_id and organization_id = _row.organization_id and requested_by = auth.uid()) then
    raise exception 'AI_INVALID_SUGGESTION';
  end if;
  update public.ai_estimate_generation_requests set
    status = case when p_suggestion_id is null then 'failed' else 'succeeded' end,
    suggestion_id = p_suggestion_id, finished_at = now(),
    error_code = case when p_suggestion_id is not null then null
      when _row.created_at < now() - interval '3 minutes' then 'TIMEOUT' else 'GENERATION_FAILED' end
    where id = p_request_id;
end;
$$;
revoke all on function public.ai_estimate_begin_generation(uuid,uuid,text) from public, anon;
revoke all on function public.ai_estimate_finish_generation(uuid,uuid) from public, anon;
grant execute on function public.ai_estimate_begin_generation(uuid,uuid,text) to authenticated;
grant execute on function public.ai_estimate_finish_generation(uuid,uuid) to authenticated;

commit;
