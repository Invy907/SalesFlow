begin;

-- Background workers use service credentials; authenticated metadata must never
-- redirect a worker to another source's original or purge target.
create function public.ai_estimate_is_source_file_path(p_org uuid, p_source uuid, p_path text)
returns boolean language sql immutable set search_path=public as $$
  select coalesce(p_path = any(array[
    p_org::text || '/' || p_source::text || '/original.pdf',
    p_org::text || '/' || p_source::text || '/original.png',
    p_org::text || '/' || p_source::text || '/original.jpg',
    p_org::text || '/' || p_source::text || '/original.jpeg'
  ]), false);
$$;
revoke all on function public.ai_estimate_is_source_file_path(uuid,uuid,text) from public,anon;
grant execute on function public.ai_estimate_is_source_file_path(uuid,uuid,text) to authenticated,service_role;

create policy ai_source_original_boundary_insert on public.ai_estimate_sources as restrictive
  for insert to authenticated with check (
    (storage_path is null or public.ai_estimate_is_source_file_path(organization_id,id,storage_path))
    and file_purge_path is null and file_purged_at is null
  );
create policy ai_source_original_boundary_update on public.ai_estimate_sources as restrictive
  for update to authenticated using (true) with check (
    (storage_path is null or public.ai_estimate_is_source_file_path(organization_id,id,storage_path))
    and (file_purge_path is null or public.ai_estimate_is_source_file_path(organization_id,id,file_purge_path))
  );

-- Existing legacy metadata can be read/reviewed, but a malformed target is never
-- claimed for deletion even when it predates the authenticated write policies.
create or replace function public.ai_estimate_claim_expired_files(p_limit integer default 10)
returns table(source_id uuid, organization_id uuid, storage_path text)
language sql security definer set search_path=public as $$
  with expired as (
    select s.id from public.ai_estimate_sources s
    left join public.ai_estimate_settings cfg on cfg.organization_id=s.organization_id
    where s.source_type='upload'
      and public.ai_estimate_is_source_file_path(s.organization_id,s.id,coalesce(s.file_purge_path,s.storage_path))
      and (s.file_purge_path is not null or (
        cfg.source_retention_days is not null and s.status in ('approved','excluded') and s.storage_path is not null
        and s.created_at < now()-make_interval(days=>cfg.source_retention_days)))
    order by s.created_at for update of s skip locked limit greatest(1,least(coalesce(p_limit,10),50))
  ) update public.ai_estimate_sources s set file_purge_path=coalesce(s.file_purge_path,s.storage_path),storage_path=null
    from expired where s.id=expired.id returning s.id,s.organization_id,s.file_purge_path;
$$;
revoke all on function public.ai_estimate_claim_expired_files(integer) from public,anon,authenticated;
grant execute on function public.ai_estimate_claim_expired_files(integer) to service_role;

commit;
