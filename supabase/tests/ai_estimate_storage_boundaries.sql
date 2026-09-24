begin;
insert into auth.users(id,instance_id,aud,role,email,raw_user_meta_data) values
 ('00000000-0000-4000-8000-000000003701','00000000-0000-0000-0000-000000000000','authenticated','authenticated','ai-path-owner@example.invalid','{}'),
 ('00000000-0000-4000-8000-000000003702','00000000-0000-0000-0000-000000000000','authenticated','authenticated','ai-path-foreign@example.invalid','{}');
select set_config('test.path_org',(select organization_id::text from public.organization_members where user_id='00000000-0000-4000-8000-000000003701'),true);
select set_config('test.foreign_org',(select organization_id::text from public.organization_members where user_id='00000000-0000-4000-8000-000000003702'),true);
insert into public.ai_estimate_sources(id,organization_id,source_type,title,storage_path,mime_type,status,uploaded_by,created_at)
values ('00000000-0000-4000-8000-000000003711',current_setting('test.path_org')::uuid,'upload','path fixture',current_setting('test.path_org')||'/00000000-0000-4000-8000-000000003711/original.pdf','application/pdf','excluded','00000000-0000-4000-8000-000000003701',now()-interval '100 days'),
 ('00000000-0000-4000-8000-000000003712',current_setting('test.path_org')::uuid,'upload','legacy invalid path',current_setting('test.foreign_org')||'/00000000-0000-4000-8000-000000003799/original.pdf','application/pdf','excluded','00000000-0000-4000-8000-000000003701',now()-interval '100 days');
insert into public.ai_estimate_settings(organization_id,source_retention_days) values(current_setting('test.path_org')::uuid,30)
 on conflict(organization_id) do update set source_retention_days=30;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000003701',true);
set local role authenticated;
do $$
declare bad_path text;
begin
  foreach bad_path in array array[
    current_setting('test.foreign_org')||'/00000000-0000-4000-8000-000000003799/original.pdf',
    current_setting('test.path_org')||'/00000000-0000-4000-8000-000000003799/original.pdf',
    current_setting('test.path_org')||'/00000000-0000-4000-8000-000000003711/../original.pdf'
  ] loop
    begin
      update public.ai_estimate_sources set storage_path=bad_path where id='00000000-0000-4000-8000-000000003711';
      raise exception 'forged original path was accepted';
    exception when insufficient_privilege then null; end;
    begin
      update public.ai_estimate_sources set file_purge_path=bad_path where id='00000000-0000-4000-8000-000000003711';
      raise exception 'forged purge path was accepted';
    exception when insufficient_privilege then null; end;
  end loop;
  begin
    insert into public.ai_estimate_sources(id,organization_id,source_type,title,storage_path,mime_type,uploaded_by)
    values('00000000-0000-4000-8000-000000003713',current_setting('test.path_org')::uuid,'upload','forged insert','foreign/original.pdf','application/pdf',auth.uid());
    raise exception 'forged insert was accepted';
  exception when insufficient_privilege then null; end;
  update public.ai_estimate_sources set storage_path=current_setting('test.path_org')||'/00000000-0000-4000-8000-000000003711/original.pdf'
    where id='00000000-0000-4000-8000-000000003711';
end $$;
reset role;
do $$
declare claimed uuid[];
begin
 select array_agg(source_id) into claimed from public.ai_estimate_claim_expired_files(50);
 assert claimed @> array['00000000-0000-4000-8000-000000003711'::uuid], 'valid source file is claimed';
 assert not (claimed @> array['00000000-0000-4000-8000-000000003712'::uuid]), 'legacy cross-org file is never deleted';
 assert not public.ai_estimate_is_source_file_path(current_setting('test.path_org')::uuid,'00000000-0000-4000-8000-000000003711',null), 'null is not a valid file';
 raise notice 'AI estimate original/retention storage boundaries passed';
end $$;
rollback;
