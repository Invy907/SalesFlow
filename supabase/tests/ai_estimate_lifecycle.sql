begin;
insert into auth.users(id,instance_id,aud,role,email,raw_user_meta_data) values
('00000000-0000-4000-8000-000000003501','00000000-0000-0000-0000-000000000000','authenticated','authenticated','ai-lifecycle-owner@example.invalid','{}'),
('00000000-0000-4000-8000-000000003502','00000000-0000-0000-0000-000000000000','authenticated','authenticated','ai-lifecycle-other@example.invalid','{}'),
('00000000-0000-4000-8000-000000003503','00000000-0000-0000-0000-000000000000','authenticated','authenticated','ai-lifecycle-viewer@example.invalid','{}');
select set_config('test.ai_org',(select organization_id::text from public.organization_members where user_id='00000000-0000-4000-8000-000000003501'),true);
select set_config('test.ai_other_org',(select organization_id::text from public.organization_members where user_id='00000000-0000-4000-8000-000000003502'),true);
insert into public.organization_members(organization_id,user_id,role) values(current_setting('test.ai_org')::uuid,'00000000-0000-4000-8000-000000003503','viewer');
insert into public.ai_estimate_sources(id,organization_id,source_type,title,storage_path,mime_type,uploaded_by,visibility) values
('00000000-0000-4000-8000-000000003511',current_setting('test.ai_org')::uuid,'upload','Synthetic quote',current_setting('test.ai_org')||'/00000000-0000-4000-8000-000000003511/original.pdf','application/pdf','00000000-0000-4000-8000-000000003501','organization'),
('00000000-0000-4000-8000-000000003512',current_setting('test.ai_org')::uuid,'upload','Synthetic private',current_setting('test.ai_org')||'/00000000-0000-4000-8000-000000003512/original.pdf','application/pdf','00000000-0000-4000-8000-000000003501','private'),
('00000000-0000-4000-8000-000000003513',current_setting('test.ai_org')::uuid,'upload','Worker quote',current_setting('test.ai_org')||'/00000000-0000-4000-8000-000000003513/original.pdf','application/pdf','00000000-0000-4000-8000-000000003501','organization');
select set_config('test.ai_review','{"clientName":"Synthetic","clientId":null,"subject":"Test","issueDate":"2026-09-22","currency":"JPY","taxMode":"excluded","templateMessage":"","remarks":"","rawText":"","confidence":1,"warnings":[],"lines":[{"name":"Design","qty":2,"unit":"hour","unitPrice":100,"taxCategory":"standard_10","confidence":1,"reason":""},{"name":"Discount","qty":1,"unit":"","unitPrice":-20,"taxCategory":"standard_10","confidence":1,"reason":""}]}',true);
set local role service_role;
do $$
begin
  assert public.ai_estimate_prepare_manual_review('00000000-0000-4000-8000-000000003511',current_setting('test.ai_review')::jsonb);
  assert public.ai_estimate_prepare_manual_review('00000000-0000-4000-8000-000000003512',current_setting('test.ai_review')::jsonb);
  assert not has_function_privilege('anon','public.ai_estimate_finish_extraction(uuid,integer,uuid,jsonb)','execute');
  assert not has_function_privilege('authenticated','public.ai_estimate_claim_jobs(uuid,uuid,text,integer,uuid)','execute');
end;
$$;
reset role;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000003501',true);
set local role authenticated;
do $$
declare _source_id uuid:='00000000-0000-4000-8000-000000003511'; example_id uuid; duplicate_id uuid; revision timestamptz; changed jsonb; saved jsonb;
begin
  select updated_at into revision from public.ai_estimate_sources where id=_source_id;
  -- A bad last line fails the whole approval, leaving no partial search rows.
  begin
    perform public.ai_estimate_approve_source(_source_id,jsonb_set(current_setting('test.ai_review')::jsonb,'{lines,1,qty}','-1'),revision);
    raise exception 'invalid quantity was approved';
  exception when invalid_parameter_value then null; end;
  assert not exists(select 1 from public.ai_estimate_examples where source_id=_source_id and id in (select c.example_id from public.ai_estimate_chunks c));
  begin
    perform public.ai_estimate_approve_source(_source_id,jsonb_set(current_setting('test.ai_review')::jsonb,'{taxMode}','"unknown"'),revision);
    raise exception 'unknown tax mode approved';
  exception when invalid_parameter_value then null; end;
  begin
    perform public.ai_estimate_approve_source(_source_id,jsonb_set(current_setting('test.ai_review')::jsonb,'{lines,0,unitPrice}','100.1'),revision);
    raise exception 'fractional JPY approved';
  exception when invalid_parameter_value then null; end;
  begin
    perform public.ai_estimate_save_review(_source_id,jsonb_set(current_setting('test.ai_review')::jsonb,'{lines,0,qty}','1.00001'),revision);
    raise exception 'quantity silently rounded';
  exception when invalid_parameter_value then null; end;
  example_id:=public.ai_estimate_approve_source(_source_id,current_setting('test.ai_review')::jsonb,revision);
  duplicate_id:=public.ai_estimate_approve_source(_source_id,current_setting('test.ai_review')::jsonb,revision);
  assert example_id=duplicate_id,'identical approval retry must preserve evidence identity';
  assert (select count(*) from public.ai_estimate_example_lines l where l.example_id=duplicate_id)=2;
  assert (select count(*) from public.ai_estimate_chunks c where c.example_id=duplicate_id)=2;
  assert exists(select 1 from public.ai_estimate_example_lines l where l.example_id=duplicate_id and unit_price=-20),'discount preserved';
  assert (select sum(sample_count) from public.ai_estimate_price_stats where organization_id=current_setting('test.ai_org')::uuid)=1,'null client must not double-count; discount excluded';
  -- Personal approvals are searchable for the owner but never enter organization price statistics.
  perform public.ai_estimate_approve_source('00000000-0000-4000-8000-000000003512',current_setting('test.ai_review')::jsonb,
    (select updated_at from public.ai_estimate_sources where id='00000000-0000-4000-8000-000000003512'));
  assert (select sum(sample_count) from public.ai_estimate_price_stats where organization_id=current_setting('test.ai_org')::uuid)=1;
  changed:=jsonb_set(current_setting('test.ai_review')::jsonb,'{lines,0,unitPrice}','120');
  begin
    perform public.ai_estimate_save_review(_source_id,changed,revision-interval '1 second');
    raise exception 'stale review saved';
  exception when serialization_failure then null; end;
  saved:=public.ai_estimate_save_review(_source_id,changed,(select updated_at from public.ai_estimate_sources where id=_source_id));
  assert (saved->>'updatedAt')::timestamptz=(select updated_at from public.ai_estimate_sources where id=_source_id),'save returns its own locked revision';
  assert not exists(select 1 from public.ai_estimate_examples e where e.source_id='00000000-0000-4000-8000-000000003511'),'human edit invalidates old example';
  assert not exists(select 1 from public.ai_estimate_price_stats where organization_id=current_setting('test.ai_org')::uuid),'human edit invalidates prices';
end;
$$;
reset role;
-- Late/manual processing cannot overwrite a saved human extraction.
set local role service_role;
do $$
declare old_data jsonb; n integer;
begin
  select extracted_data into old_data from public.ai_estimate_extractions where source_id='00000000-0000-4000-8000-000000003511';
  perform public.ai_estimate_prepare_manual_review('00000000-0000-4000-8000-000000003511','{"lines":[]}'::jsonb);
  assert old_data=(select extracted_data from public.ai_estimate_extractions where source_id='00000000-0000-4000-8000-000000003511');
  n:=public.ai_estimate_queue_jobs(current_setting('test.ai_org')::uuid,false,10,3,null,'00000000-0000-4000-8000-000000003501');
  assert n=1,'only the untouched worker source can be queued';
  assert exists(select 1 from public.ai_estimate_pending_sources(3) where source_id='00000000-0000-4000-8000-000000003513'),'completed upload is recoverable';
end;
$$;
reset role;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000003503',true);
set local role authenticated;
do $$
begin
  begin
    perform public.ai_estimate_approve_source('00000000-0000-4000-8000-000000003511',current_setting('test.ai_review')::jsonb,now());
    raise exception 'viewer approved source';
  exception when insufficient_privilege then null; end;
end;
$$;
reset role;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000003502',true);
set local role authenticated;
do $$
begin
  begin
    perform public.ai_estimate_save_review('00000000-0000-4000-8000-000000003511',current_setting('test.ai_review')::jsonb,now());
    raise exception 'foreign organization saved review';
  exception when insufficient_privilege then null; end;
end;
$$;
reset role;
-- Worker result and job state are committed together and duplicated/stale responses are ignored.
insert into public.ai_estimate_batch_runs(id,organization_id,command,mode,created_by)
values('00000000-0000-4000-8000-000000003521',current_setting('test.ai_org')::uuid,'smoke','live','00000000-0000-4000-8000-000000003501');
set local role service_role;
do $$
declare job public.ai_estimate_jobs; accepted boolean; result jsonb;
begin
  select * into job from public.ai_estimate_claim_jobs(current_setting('test.ai_org')::uuid,'00000000-0000-4000-8000-000000003521','synthetic-worker',1,'00000000-0000-4000-8000-000000003513');
  assert job.source_id='00000000-0000-4000-8000-000000003513';
  result:=jsonb_build_object('outcome','succeeded','model','synthetic-model','promptVersion','test-v1','extractionVersion','test-v1','rawOutput','{}'::jsonb,
    'normalized','{}'::jsonb,'confidence',1,'reviewExtraction',current_setting('test.ai_review')::jsonb,'reviewReasons','[]'::jsonb);
  accepted:=public.ai_estimate_finish_extraction(job.id,job.attempt,job.last_run_id,result);
  assert accepted;
  assert not public.ai_estimate_finish_extraction(job.id,job.attempt,job.last_run_id,result),'duplicate result ignored';
  assert (select status from public.ai_estimate_sources where id=job.source_id)='review_required';
  assert not exists(select 1 from public.ai_estimate_examples where source_id=job.source_id),'AI never auto-approves';
  -- A dead worker recovers without resetting its attempt counter.
  update public.ai_estimate_jobs set status='extracting',locked_at=now()-interval '16 minutes',attempt=1 where id=job.id;
  update public.ai_estimate_sources set status='processing' where id=job.source_id;
  assert public.ai_estimate_queue_jobs(current_setting('test.ai_org')::uuid,true,1,3,job.source_id,'00000000-0000-4000-8000-000000003501')=1;
  assert (select attempt from public.ai_estimate_jobs where id=job.id)=1;
  update public.ai_estimate_jobs set status='failed_permanent',attempt=3,max_attempt=3 where id=job.id;
  update public.ai_estimate_sources set status='failed' where id=job.source_id;
  assert public.ai_estimate_queue_jobs(current_setting('test.ai_org')::uuid,true,1,3,job.source_id,'00000000-0000-4000-8000-000000003501')=0,'automatic retry budget is bounded';
  assert public.ai_estimate_queue_jobs(current_setting('test.ai_org')::uuid,true,1,3,job.source_id,'00000000-0000-4000-8000-000000003501',true)=1,'explicit retry permits one new attempt';
  assert (select max_attempt from public.ai_estimate_jobs where id=job.id)=4;
  assert (select attempt from public.ai_estimate_jobs where id=job.id)=3,'manual retry preserves audit attempt numbers';
end;
$$;
reset role;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000003501',true);
set local role authenticated;
do $$
declare _source_id uuid:='00000000-0000-4000-8000-000000003511';
begin
  perform public.ai_estimate_approve_source(_source_id,(select extracted_data from public.ai_estimate_extractions where source_id='00000000-0000-4000-8000-000000003511'),
    (select updated_at from public.ai_estimate_sources where id='00000000-0000-4000-8000-000000003511'));
  update public.ai_estimate_sources set status='excluded' where id=_source_id;
  assert not exists(select 1 from public.ai_estimate_examples e where e.source_id='00000000-0000-4000-8000-000000003511');
  assert not exists(select 1 from public.ai_estimate_price_stats where organization_id=current_setting('test.ai_org')::uuid);
  delete from public.ai_estimate_sources where id='00000000-0000-4000-8000-000000003512';
  assert not exists(select 1 from public.ai_estimate_examples e where e.source_id='00000000-0000-4000-8000-000000003512');
  raise notice 'AI estimate lifecycle regression checks passed';
end;
$$;
rollback;
