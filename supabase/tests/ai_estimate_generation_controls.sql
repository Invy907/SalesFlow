-- Generation reservation, replay, privacy and quota regression. Synthetic rows always roll back.
begin;
insert into auth.users(id, instance_id, aud, role, email, raw_user_meta_data) values
 ('00000000-0000-4000-8000-000000003601','00000000-0000-0000-0000-000000000000','authenticated','authenticated','generation-owner@example.invalid','{}'),
 ('00000000-0000-4000-8000-000000003602','00000000-0000-0000-0000-000000000000','authenticated','authenticated','generation-member@example.invalid','{}'),
 ('00000000-0000-4000-8000-000000003603','00000000-0000-0000-0000-000000000000','authenticated','authenticated','generation-viewer@example.invalid','{}'),
 ('00000000-0000-4000-8000-000000003604','00000000-0000-0000-0000-000000000000','authenticated','authenticated','generation-other@example.invalid','{}');
create temporary table generation_context as select organization_id org from public.organization_members where user_id='00000000-0000-4000-8000-000000003601';
grant select on generation_context to authenticated;
insert into public.organization_members(organization_id,user_id,role) select org,'00000000-0000-4000-8000-000000003602','member' from generation_context;
insert into public.organization_members(organization_id,user_id,role) select org,'00000000-0000-4000-8000-000000003603','viewer' from generation_context;
insert into public.ai_estimate_settings(organization_id, enabled, daily_generation_limit) select org,true,3 from generation_context
on conflict(organization_id) do update set enabled=true,daily_generation_limit=3;
insert into public.ai_estimate_suggestions(id,organization_id,requested_by,prompt_text,suggestion_data)
select md5('generation-suggestion-'||n)::uuid,org,
 case when n=2 then '00000000-0000-4000-8000-000000003602'::uuid else '00000000-0000-4000-8000-000000003601'::uuid end,
 'synthetic private work instructions','{"private":"synthetic"}'::jsonb
from generation_context cross join generate_series(1,3) n;
create function pg_temp.expect_error(p_sql text,p_expected text) returns void language plpgsql as $$
begin
  begin execute p_sql;
  exception when others then
    if position(p_expected in sqlerrm)>0 then return; end if;
    raise;
  end;
  raise exception 'Expected error % was not raised',p_expected;
end $$;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000003601',true);
set local role authenticated;
do $$ declare org_id uuid; reservation jsonb; replay jsonb; request_id uuid; changed integer; begin
 select org into org_id from generation_context;
 assert (select count(*) from public.ai_estimate_suggestions where organization_id=org_id)=2, 'owner only reads own suggestions, not member private work';
 update public.ai_estimate_suggestions set prompt_text='forbidden' where id=md5('generation-suggestion-2')::uuid;
 get diagnostics changed=row_count; assert changed=0,'owner cannot edit another member suggestion';
 delete from public.ai_estimate_suggestions where id=md5('generation-suggestion-2')::uuid;
 get diagnostics changed=row_count; assert changed=0,'owner cannot delete another member suggestion';
 perform pg_temp.expect_error(format('insert into public.ai_estimate_suggestions(organization_id,requested_by,prompt_text) values(%L,%L,%L)',org_id,'00000000-0000-4000-8000-000000003602','impersonate'),'row-level security');
 perform pg_temp.expect_error(format('update public.ai_estimate_suggestions set requested_by=%L where id=%L','00000000-0000-4000-8000-000000003602',md5('generation-suggestion-1')::uuid),'row-level security');
 reservation:=public.ai_estimate_begin_generation(org_id,md5('generation-request-1')::uuid,repeat('a',64));
 assert reservation->>'status'='started','first reservation starts';
 request_id:=(reservation->>'id')::uuid;
 perform set_config('test.owner_generation_request',request_id::text,true);
 replay:=public.ai_estimate_begin_generation(org_id,md5('generation-request-1')::uuid,repeat('a',64));
 assert replay->>'status'='running' and replay->>'id'=reservation->>'id','same input key replays running reservation';
 assert (select count(*) from public.ai_estimate_generation_requests where organization_id=org_id)=1,'idempotent replay costs one request';
 perform pg_temp.expect_error(format('select public.ai_estimate_begin_generation(%L,%L,%L)',org_id,md5('generation-request-1')::uuid,repeat('b',64)),'AI_REQUEST_CHANGED');
 perform pg_temp.expect_error(format('select public.ai_estimate_begin_generation(%L,%L,%L)',org_id,md5('generation-request-2')::uuid,repeat('a',64)),'AI_REQUEST_RUNNING');
 perform pg_temp.expect_error(format('insert into public.ai_estimate_generation_requests(organization_id,requested_by,request_key,fingerprint) values(%L,%L,%L,%L)',org_id,auth.uid(),gen_random_uuid(),repeat('a',64)),'permission denied');
 perform pg_temp.expect_error(format('select public.ai_estimate_finish_generation(%L,%L)',request_id,md5('generation-suggestion-2')::uuid),'AI_INVALID_SUGGESTION');
 perform public.ai_estimate_finish_generation(request_id,md5('generation-suggestion-1')::uuid);
 perform public.ai_estimate_finish_generation(request_id,md5('generation-suggestion-1')::uuid);
 replay:=public.ai_estimate_begin_generation(org_id,md5('generation-request-1')::uuid,repeat('a',64));
 assert replay->>'status'='succeeded' and (replay->>'suggestionId')::uuid=md5('generation-suggestion-1')::uuid,'completed input replays exact saved suggestion';
 perform pg_temp.expect_error(format('select public.ai_estimate_finish_generation(%L,%L)',request_id,md5('generation-suggestion-3')::uuid),'AI_REQUEST_FINISHED');
 perform pg_temp.expect_error(format('select public.ai_estimate_begin_generation(%L,%L,%L)',org_id,gen_random_uuid(),'bad-hash'),'AI_INVALID_REQUEST');
 -- One more owner request stays running while another organization member starts their own.
 reservation:=public.ai_estimate_begin_generation(org_id,md5('generation-request-2')::uuid,repeat('a',64));
 assert reservation->>'status'='started','finished user may start again';
 raise notice 'Generation replay, immutable terminal result and suggestion-owner checks passed';
end $$;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000003602',true);
do $$ declare org_id uuid; reservation jsonb; begin
 select org into org_id from generation_context;
 assert (select count(*) from public.ai_estimate_suggestions where organization_id=org_id)=1,'member sees own suggestion only';
 perform pg_temp.expect_error(format('select public.ai_estimate_finish_generation(%L,null)',current_setting('test.owner_generation_request')::uuid),'AI_WRITE_REQUIRED');
 assert not exists(select 1 from public.ai_estimate_generation_requests where organization_id=org_id),'member cannot read another user reservation';
 reservation:=public.ai_estimate_begin_generation(org_id,md5('generation-request-3')::uuid,repeat('a',64));
 assert reservation->>'status'='started','different writers may work concurrently';
 perform public.ai_estimate_finish_generation((reservation->>'id')::uuid,null);
 perform pg_temp.expect_error(format('select public.ai_estimate_begin_generation(%L,%L,%L)',org_id,md5('generation-request-4')::uuid,repeat('a',64)),'AI_DAILY_LIMIT');
end $$;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000003603',true);
do $$ declare org_id uuid; begin
 select org into org_id from generation_context;
 assert not exists(select 1 from public.ai_estimate_suggestions where organization_id=org_id),'viewer has no access to member private suggestions';
 perform pg_temp.expect_error(format('select public.ai_estimate_begin_generation(%L,%L,%L)',org_id,gen_random_uuid(),repeat('a',64)),'AI_WRITE_REQUIRED');
 perform pg_temp.expect_error(format('insert into public.ai_estimate_suggestions(organization_id,requested_by,prompt_text) values(%L,%L,%L)',org_id,auth.uid(),'viewer bypass'),'row-level security');
end $$;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000003604',true);
do $$ declare org_id uuid; begin
 select org into org_id from generation_context;
 perform pg_temp.expect_error(format('select public.ai_estimate_begin_generation(%L,%L,%L)',org_id,gen_random_uuid(),repeat('a',64)),'AI_WRITE_REQUIRED');
 assert not exists(select 1 from public.ai_estimate_suggestions where organization_id=org_id),'other organization cannot read suggestions';
end $$;
reset role;
-- Expire the owner's running request and lift the quota for focused expiration checks.
update public.ai_estimate_generation_requests set created_at=now()-interval '4 minutes' where request_key=md5('generation-request-2')::uuid;
update public.ai_estimate_settings set daily_generation_limit=10 where organization_id=(select org from generation_context);
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000003601',true);
set local role authenticated;
do $$ declare org_id uuid; old_id uuid; reservation jsonb; begin
 select org into org_id from generation_context;
 select id into old_id from public.ai_estimate_generation_requests where request_key=md5('generation-request-2')::uuid;
 perform pg_temp.expect_error(format('select public.ai_estimate_finish_generation(%L,%L)',old_id,md5('generation-suggestion-1')::uuid),'AI_REQUEST_EXPIRED');
 reservation:=public.ai_estimate_begin_generation(org_id,md5('generation-request-after-timeout')::uuid,repeat('a',64));
 assert reservation->>'status'='started','expired request does not prevent a new request';
 assert (select status='failed' and error_code='TIMEOUT' from public.ai_estimate_generation_requests where id=old_id),'expiration is recorded';
 perform pg_temp.expect_error(format('select public.ai_estimate_finish_generation(%L,%L)',old_id,md5('generation-suggestion-1')::uuid),'AI_REQUEST_EXPIRED');
 perform public.ai_estimate_finish_generation(old_id,null);
 perform public.ai_estimate_finish_generation((reservation->>'id')::uuid,null);
 perform pg_temp.expect_error(format('select public.ai_estimate_finish_generation(%L,%L)',(reservation->>'id')::uuid,md5('generation-suggestion-1')::uuid),'AI_REQUEST_FINISHED');
 assert public.ai_estimate_begin_generation(org_id,md5('generation-request-2')::uuid,repeat('a',64))->>'status'='failed','same expired key cannot start a duplicate provider call';
end $$;
reset role;
-- JST previous day does not consume today's quota, even when UTC is still the previous date.
update public.ai_estimate_generation_requests set status='failed',created_at=(date_trunc('day',now() at time zone 'Asia/Tokyo') at time zone 'Asia/Tokyo')-interval '1 second'
where organization_id=(select org from generation_context);
update public.ai_estimate_settings set daily_generation_limit=1 where organization_id=(select org from generation_context);
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000003601',true);
set local role authenticated;
do $$ declare org_id uuid; reservation jsonb; begin
 select org into org_id from generation_context;
 reservation:=public.ai_estimate_begin_generation(org_id,md5('generation-new-jst-day')::uuid,repeat('a',64));
 assert reservation->>'status'='started','JST day boundary resets quota';
 perform public.ai_estimate_finish_generation((reservation->>'id')::uuid,null);
 perform pg_temp.expect_error(format('select public.ai_estimate_begin_generation(%L,%L,%L)',org_id,gen_random_uuid(),repeat('a',64)),'AI_DAILY_LIMIT');
end $$;
reset role;
update public.ai_estimate_settings set enabled=false,daily_generation_limit=100 where organization_id=(select org from generation_context);
set local role authenticated;
do $$ begin
 perform pg_temp.expect_error(format('select public.ai_estimate_begin_generation(%L,%L,%L)',(select org from generation_context),gen_random_uuid(),repeat('a',64)),'AI_DISABLED');
end $$;
reset role;
set local role anon;
do $$ begin
 assert not has_function_privilege('anon','public.ai_estimate_begin_generation(uuid,uuid,text)','EXECUTE'),'anonymous cannot reserve';
 assert not has_function_privilege('anon','public.ai_estimate_finish_generation(uuid,uuid)','EXECUTE'),'anonymous cannot finish';
end $$;
rollback;
