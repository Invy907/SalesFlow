begin;

insert into auth.users(id,instance_id,aud,role,email,raw_user_meta_data) values
('00000000-0000-4000-8000-000000003801','00000000-0000-0000-0000-000000000000','authenticated','authenticated','kinds-owner@example.invalid','{}'),
('00000000-0000-4000-8000-000000003802','00000000-0000-0000-0000-000000000000','authenticated','authenticated','kinds-other@example.invalid','{}'),
('00000000-0000-4000-8000-000000003803','00000000-0000-0000-0000-000000000000','authenticated','authenticated','kinds-viewer@example.invalid','{}'),
('00000000-0000-4000-8000-000000003804','00000000-0000-0000-0000-000000000000','authenticated','authenticated','kinds-member@example.invalid','{}');
select set_config('test.kinds_org',(select organization_id::text from public.organization_members where user_id='00000000-0000-4000-8000-000000003801'),true);
select set_config('test.kinds_foreign_org',(select organization_id::text from public.organization_members where user_id='00000000-0000-4000-8000-000000003802'),true);
insert into public.organization_members(organization_id,user_id,role) values
(current_setting('test.kinds_org')::uuid,'00000000-0000-4000-8000-000000003803','viewer'),
(current_setting('test.kinds_org')::uuid,'00000000-0000-4000-8000-000000003804','member');
insert into public.ai_estimate_settings(organization_id,allow_private_sources) values(current_setting('test.kinds_org')::uuid,true)
  on conflict(organization_id) do update set allow_private_sources=true;
insert into public.clients(id,organization_id,name) values
('00000000-0000-4000-8000-000000003811',current_setting('test.kinds_org')::uuid,'Price list client'),
('00000000-0000-4000-8000-000000003812',current_setting('test.kinds_org')::uuid,'Other client');

create function pg_temp.kinds_extraction(kind text,price integer default 100,client uuid default null) returns jsonb language sql as $$
  select jsonb_build_object('documentKind',kind,'clientName','Synthetic','clientId',client,'subject','Design sharedterm','issueDate','2026-09-24',
    'currency','JPY','taxMode',case when kind in ('design','work_scope') then 'unknown' else 'excluded' end,
    'workDetails',case when kind in ('design','work_scope') then 'Design sharedterm section content' else '' end,
    'assumptions','Approved scope only','exclusions','Hosting excluded','templateMessage','','remarks','','rawText','','confidence',1,'warnings','[]'::jsonb,
    'lines',case when kind in ('design','work_scope') then '[]'::jsonb else jsonb_build_array(jsonb_build_object(
      'name','Design sharedterm','qty',2,'unit','hour','unitPrice',price,'taxCategory','standard_10','confidence',1,'reason','Approved price')) end);
$$;
create function pg_temp.kinds_publish(kind text,price integer default 100,metadata jsonb default '{}'::jsonb,visibility text default 'organization',client uuid default null)
returns uuid language plpgsql as $$
declare created_id uuid; extraction jsonb:=pg_temp.kinds_extraction(kind,price,client);
begin
  created_id:=public.ai_estimate_create_manual_source(current_setting('test.kinds_org')::uuid,'Synthetic '||kind,visibility,
    jsonb_build_object('documentKind',kind,'projectName','Project A','revision','v1')||metadata,extraction);
  perform public.ai_estimate_approve_source(created_id,extraction,(select updated_at from public.ai_estimate_sources where ai_estimate_sources.id=created_id));
  return created_id;
end;
$$;

select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000003801',true);
set local role authenticated;
select set_config('test.kinds_estimate',pg_temp.kinds_publish('estimate',100)::text,true);
select set_config('test.kinds_other_estimate',pg_temp.kinds_publish('estimate',900)::text,true);
select set_config('test.kinds_price_list',pg_temp.kinds_publish('price_list',300)::text,true);
select set_config('test.kinds_design',pg_temp.kinds_publish('design')::text,true);
select set_config('test.kinds_scope',pg_temp.kinds_publish('work_scope')::text,true);
select set_config('test.kinds_expired',pg_temp.kinds_publish('estimate',500,jsonb_build_object('validUntil',(now() at time zone 'Asia/Tokyo')::date-1))::text,true);
select set_config('test.kinds_future',pg_temp.kinds_publish('price_list',800,jsonb_build_object('validFrom',(now() at time zone 'Asia/Tokyo')::date+1))::text,true);
select set_config('test.kinds_client_price',pg_temp.kinds_publish('price_list',250,'{}','organization','00000000-0000-4000-8000-000000003811')::text,true);
select set_config('test.kinds_private',pg_temp.kinds_publish('estimate',700,'{}','private')::text,true);
select set_config('test.kinds_today',pg_temp.kinds_publish('work_scope',100,jsonb_build_object('validFrom',(now() at time zone 'Asia/Tokyo')::date,'validUntil',(now() at time zone 'Asia/Tokyo')::date))::text,true);

do $$
declare src public.ai_estimate_sources; example public.ai_estimate_examples; data jsonb; n integer; saved jsonb; bad_ids uuid[];
begin
  select * into src from public.ai_estimate_sources where id=current_setting('test.kinds_design')::uuid;
  select * into example from public.ai_estimate_examples where source_id=src.id;
  assert src.source_type='manual' and src.storage_path is null and src.status='approved';
  assert example.document_kind='design' and example.project_name='Project A' and example.revision='v1';
  assert example.tax_mode='unknown' and char_length(example.work_details)>0;
  assert not exists(select 1 from public.ai_estimate_example_lines where example_id=example.id),'context creates no price lines';
  assert exists(select 1 from public.ai_estimate_chunks where example_id=example.id and content like '%Hosting excluded%'),'context is indexed';
  assert (select sum(sample_count) from public.ai_estimate_price_stats where organization_id=src.organization_id)=2,'only active public historical estimates enter price statistics';
  begin
    update public.ai_estimate_sources set revision='v2' where id=src.id;
    raise exception 'metadata mutation succeeded';
  exception when insufficient_privilege then null; end;
  begin
    perform public.ai_estimate_save_review(src.id,pg_temp.kinds_extraction('estimate'),src.updated_at);
    raise exception 'kind mismatch saved';
  exception when invalid_parameter_value then null; end;
  begin
    perform public.ai_estimate_create_manual_source(src.organization_id,'Bad','organization','{"documentKind":"design"}',pg_temp.kinds_extraction('estimate'));
    raise exception 'registration kind mismatch succeeded';
  exception when invalid_parameter_value then null; end;
  begin
    perform public.ai_estimate_create_manual_source(src.organization_id,'Bad dates','organization','{"documentKind":"design","validFrom":"2030-01-02","validUntil":"2030-01-01"}',pg_temp.kinds_extraction('design'));
    raise exception 'inverted dates succeeded';
  exception when invalid_parameter_value then null; end;
  begin
    perform public.ai_estimate_create_manual_source(src.organization_id,'Context with price','organization','{"documentKind":"design"}',
      pg_temp.kinds_extraction('design')||jsonb_build_object('lines',pg_temp.kinds_extraction('estimate')->'lines'));
    raise exception 'context accepted price lines';
  exception when invalid_parameter_value then null; end;
  begin
    perform public.ai_estimate_approve_source(src.id,pg_temp.kinds_extraction('design')||'{"workDetails":"  "}',src.updated_at);
    raise exception 'empty context approved';
  exception when invalid_parameter_value then null; end;
  begin
    perform public.ai_estimate_approve_source(current_setting('test.kinds_estimate')::uuid,pg_temp.kinds_extraction('estimate')||'{"lines":[]}',(select updated_at from public.ai_estimate_sources where id=current_setting('test.kinds_estimate')::uuid));
    raise exception 'empty estimate approved';
  exception when invalid_parameter_value then null; end;
  data:=pg_temp.kinds_extraction('price_list')||jsonb_build_object('lines',
    (pg_temp.kinds_extraction('price_list')->'lines')||(pg_temp.kinds_extraction('price_list',-10)->'lines'));
  begin
    perform public.ai_estimate_approve_source(current_setting('test.kinds_price_list')::uuid,data,(select updated_at from public.ai_estimate_sources where id=current_setting('test.kinds_price_list')::uuid));
    raise exception 'negative rate card price approved';
  exception when invalid_parameter_value then null; end;
  data:=pg_temp.kinds_extraction('design')||jsonb_build_object('workDetails',repeat('section sharedterm ',800)||' uniqueendtoken');
  saved:=public.ai_estimate_save_review(src.id,data,src.updated_at);
  perform public.ai_estimate_approve_source(src.id,data,(saved->>'updatedAt')::timestamptz);
  assert exists(select 1 from public.ai_estimate_chunks c join public.ai_estimate_examples e on e.id=c.example_id
    where e.source_id=src.id and c.content like '%uniqueendtoken%'),'end of long context remains indexed';
  assert (select count(*) from public.ai_estimate_search_approved_v2(src.organization_id,'uniqueendtoken'))=1,'context is lexically searchable';
  assert (select count(*) from public.ai_estimate_search_approved_v2(src.organization_id,'unrelated query',null,null,null,false,1,
    array[current_setting('test.kinds_estimate')::uuid,src.id]))=2,'selected sources bypass relevance and are never dropped by limit';
  assert (select r.example->>'source_title' from public.ai_estimate_search_approved_v2(src.organization_id,'',null,null,null,false,1,array[src.id]) r)='Synthetic design';
  assert (select count(*) from public.ai_estimate_search_approved_v2(src.organization_id,'',null,null,null,false,1,array[current_setting('test.kinds_today')::uuid]))=1,'date boundaries are inclusive';
  assert (select count(distinct r.example->>'document_kind') from public.ai_estimate_search_approved_v2(src.organization_id,'sharedterm',null,null,null,false,2) r)=2,
    'automatic retrieval balances contextual and price material';
  assert not exists(select 1 from public.ai_estimate_search_approved_v2(src.organization_id,'sharedterm') r
    where r.example->>'source_id' in (current_setting('test.kinds_expired'),current_setting('test.kinds_future'),current_setting('test.kinds_client_price'))),'automatic selection excludes inactive and client-specific rate cards';
  assert exists(select 1 from public.ai_estimate_search_approved_v2(src.organization_id,'sharedterm',null,null,'00000000-0000-4000-8000-000000003811') r
    where r.example->>'source_id'=current_setting('test.kinds_client_price')),'matching client receives its rate card';
  foreach bad_ids slice 1 in array array[
    array[current_setting('test.kinds_expired')::uuid],array[current_setting('test.kinds_future')::uuid],
    array[current_setting('test.kinds_client_price')::uuid],array['00000000-0000-4000-8000-000000009999'::uuid]
  ] loop
    begin
      perform public.ai_estimate_search_approved_v2(src.organization_id,'sharedterm',null,null,null,true,10,bad_ids);
      raise exception 'invalid selection silently accepted';
    exception when insufficient_privilege then assert sqlerrm='AI_REFERENCE_UNAVAILABLE'; end;
  end loop;
  begin
    perform public.ai_estimate_search_approved_v2(src.organization_id,'',null,null,null,false,10,array[src.id,src.id]);
    raise exception 'duplicate selection accepted';
  exception when invalid_parameter_value then assert sqlerrm='AI_REFERENCE_UNAVAILABLE'; end;
  begin
    perform public.ai_estimate_search_approved_v2(src.organization_id,'',null,null,null,false,10,array[src.id,null]);
    raise exception 'null selection accepted';
  exception when invalid_parameter_value then assert sqlerrm='AI_REFERENCE_UNAVAILABLE'; end;
  begin
    perform public.ai_estimate_search_approved_v2(src.organization_id,'',null,null,null,false,10,array[array[src.id]]);
    raise exception 'multidimensional selection accepted';
  exception when invalid_parameter_value then assert sqlerrm='AI_REFERENCE_UNAVAILABLE'; end;
  begin
    perform public.ai_estimate_search_approved_v2(src.organization_id,'',null,null,null,false,10,array[current_setting('test.kinds_private')::uuid]);
    raise exception 'private selection bypassed opt-out';
  exception when insufficient_privilege then assert sqlerrm='AI_REFERENCE_UNAVAILABLE'; end;
  select array_agg(gen_random_uuid()) into bad_ids from generate_series(1,11);
  begin
    perform public.ai_estimate_search_approved_v2(src.organization_id,'',null,null,null,false,10,bad_ids);
    raise exception '11 sources accepted';
  exception when invalid_parameter_value then assert sqlerrm='AI_REFERENCE_UNAVAILABLE'; end;
  assert not exists(select 1 from public.ai_estimate_get_price_anchors_v2(src.organization_id,null,null,array[src.id])),'context has no statistical price';
  assert not exists(select 1 from public.ai_estimate_get_price_anchors_v2(src.organization_id,null,null,array[current_setting('test.kinds_price_list')::uuid])),'rate card is a direct fact, never statistical evidence';
  assert (select median_price=100 and sample_count=1 from public.ai_estimate_get_price_anchors_v2(src.organization_id,null,null,
    array[current_setting('test.kinds_estimate')::uuid])),'strict anchors never include unselected 900 or rate-card 300';
  assert (select median_price=500 and sample_count=2 from public.ai_estimate_get_price_anchors_v2(src.organization_id,null)),'automatic anchors use both compatible historical documents only';
  begin
    perform public.ai_estimate_get_price_anchors_v2(src.organization_id,null,null,array[current_setting('test.kinds_expired')::uuid]);
    raise exception 'anchor invalid selection accepted';
  exception when insufficient_privilege then assert sqlerrm='AI_REFERENCE_UNAVAILABLE'; end;
  -- Reapproval still replaces old facts, and stale review writes remain rejected.
  select updated_at into src.updated_at from public.ai_estimate_sources where id=src.id;
  begin
    perform public.ai_estimate_save_review(src.id,data,src.updated_at-interval '1 second');
    raise exception 'stale contextual review accepted';
  exception when serialization_failure then null; end;
end;
$$;
reset role;

-- A member may register their own manual material but cannot approve it or read another user's private selection.
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000003804',true);
set local role authenticated;
do $$
declare created_id uuid;
begin
  created_id:=public.ai_estimate_create_manual_source(current_setting('test.kinds_org')::uuid,'Member context','private','{"documentKind":"work_scope"}',pg_temp.kinds_extraction('work_scope'));
  begin
    perform public.ai_estimate_approve_source(created_id,pg_temp.kinds_extraction('work_scope'),(select updated_at from public.ai_estimate_sources where ai_estimate_sources.id=created_id));
    raise exception 'member approved';
  exception when insufficient_privilege then null; end;
  begin
    perform public.ai_estimate_search_approved_v2(current_setting('test.kinds_org')::uuid,'',null,null,null,true,10,array[current_setting('test.kinds_private')::uuid]);
    raise exception 'another owner private source selected';
  exception when insufficient_privilege then assert sqlerrm='AI_REFERENCE_UNAVAILABLE'; end;
end;
$$;
reset role;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000003803',true);
set local role authenticated;
do $$
begin
  begin
    perform public.ai_estimate_create_manual_source(current_setting('test.kinds_org')::uuid,'Viewer context','organization','{"documentKind":"design"}',pg_temp.kinds_extraction('design'));
    raise exception 'viewer wrote';
  exception when insufficient_privilege then null; end;
end;
$$;
reset role;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000003802',true);
set local role authenticated;
do $$
begin
  begin
    perform public.ai_estimate_create_manual_source(current_setting('test.kinds_org')::uuid,'Foreign context','organization','{"documentKind":"design"}',pg_temp.kinds_extraction('design'));
    raise exception 'foreign organization wrote';
  exception when insufficient_privilege then null; end;
  begin
    perform public.ai_estimate_search_approved_v2(current_setting('test.kinds_foreign_org')::uuid,'',null,null,null,true,10,array[current_setting('test.kinds_design')::uuid]);
    raise exception 'foreign source selected';
  exception when insufficient_privilege then assert sqlerrm='AI_REFERENCE_UNAVAILABLE'; end;
end;
$$;
reset role;

do $$
declare org uuid:=current_setting('test.kinds_org')::uuid; src uuid:=current_setting('test.kinds_estimate')::uuid; ext text;
begin
  foreach ext in array array['pdf','png','jpg','jpeg','csv','xlsx','txt','md'] loop
    assert public.ai_estimate_is_source_file_path(org,src,org::text||'/'||src::text||'/original.'||ext);
    assert not public.ai_estimate_is_source_file_path(org,gen_random_uuid(),org::text||'/'||src::text||'/original.'||ext);
  end loop;
  assert (select allowed_mime_types @> array['text/csv','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','text/plain','text/markdown'] and file_size_limit=20971520
    from storage.buckets where id='ai-estimate-sources');
  assert not has_function_privilege('anon','public.ai_estimate_create_manual_source(uuid,text,text,jsonb,jsonb)','execute');
  assert not has_function_privilege('anon','public.ai_estimate_search_approved_v2(uuid,text,text,text,uuid,boolean,integer,uuid[],date)','execute');
  assert not has_function_privilege('authenticated','public.ai_estimate_validate_review(jsonb,boolean)','execute'),'internal validator is only reached through authorized RPCs';
end;
$$;

-- Same-file versions coexist, while identical active registrations are still deduplicated.
do $$
declare org uuid:=current_setting('test.kinds_org')::uuid; created_id uuid; version_label text;
begin
  foreach version_label in array array['v1','v2','v1'] loop
    created_id:=gen_random_uuid();
    begin
      insert into public.ai_estimate_sources(id,organization_id,source_type,title,storage_path,mime_type,uploaded_by,file_hash,document_kind,revision)
        values(created_id,org,'upload','CSV rate card',org::text||'/'||created_id::text||'/original.csv','text/csv',
          '00000000-0000-4000-8000-000000003801',repeat('3',64),'price_list',version_label);
      if version_label='v1' and (select count(*) from public.ai_estimate_sources where organization_id=org and file_hash=repeat('3',64))>2 then
        raise exception 'identical active version accepted';
      end if;
    exception when unique_violation then assert version_label='v1'; end;
  end loop;
  assert (select count(*) from public.ai_estimate_sources where organization_id=org and file_hash=repeat('3',64))=2;
  created_id:=gen_random_uuid();
  insert into public.ai_estimate_sources(id,organization_id,source_type,title,storage_path,mime_type,uploaded_by,file_hash,document_kind,revision,valid_from)
    values(created_id,org,'upload','Different validity',org::text||'/'||created_id::text||'/original.csv','text/csv',
      '00000000-0000-4000-8000-000000003801',repeat('3',64),'price_list','v1','2030-01-01');
  assert (select count(*) from public.ai_estimate_sources where organization_id=org and file_hash=repeat('3',64))=3;
end;
$$;

-- Local file extraction uses the same locked job lifecycle and records its actual provider.
insert into public.ai_estimate_sources(id,organization_id,source_type,title,storage_path,mime_type,uploaded_by,document_kind)
  values('00000000-0000-4000-8000-000000003831',current_setting('test.kinds_org')::uuid,'upload','Local work details',
    current_setting('test.kinds_org')||'/00000000-0000-4000-8000-000000003831/original.md','text/markdown','00000000-0000-4000-8000-000000003801','work_scope');
insert into public.ai_estimate_batch_runs(id,organization_id,command,mode,created_by)
  values('00000000-0000-4000-8000-000000003832',current_setting('test.kinds_org')::uuid,'smoke','live','00000000-0000-4000-8000-000000003801');
set local role service_role;
do $$
declare job public.ai_estimate_jobs; result jsonb;
begin
  assert public.ai_estimate_queue_jobs(current_setting('test.kinds_org')::uuid,false,1,3,
    '00000000-0000-4000-8000-000000003831','00000000-0000-4000-8000-000000003801')=1;
  select * into job from public.ai_estimate_claim_jobs(current_setting('test.kinds_org')::uuid,
    '00000000-0000-4000-8000-000000003832','local-parser-test',1,'00000000-0000-4000-8000-000000003831');
  result:=jsonb_build_object('provider','local','outcome','succeeded','model','local-document-v1','promptVersion','test-v1',
    'extractionVersion','test-v1','rawOutput','{}'::jsonb,'normalized','{}'::jsonb,'confidence',1,
    'reviewExtraction',pg_temp.kinds_extraction('work_scope'),'reviewReasons','[]'::jsonb);
  begin
    perform public.ai_estimate_finish_extraction(job.id,job.attempt,job.last_run_id,result||'{"provider":"unknown"}');
    raise exception 'unrecognized provider accepted';
  exception when invalid_parameter_value then null; end;
  begin
    perform public.ai_estimate_finish_extraction(job.id,job.attempt,job.last_run_id,result||jsonb_build_object('reviewExtraction',pg_temp.kinds_extraction('estimate')));
    raise exception 'worker changed registered kind';
  exception when invalid_parameter_value then null; end;
  assert public.ai_estimate_finish_extraction(job.id,job.attempt,job.last_run_id,result);
  assert (select provider='local' and extracted_data->>'documentKind'='work_scope' and extracted_data->>'workDetails'='Design sharedterm section content'
    from public.ai_estimate_extractions where source_id=job.source_id),'local provider and work details persist';
  assert (select provider='local' from public.ai_estimate_extraction_runs where source_id=job.source_id);
  assert (select status='review_required' from public.ai_estimate_sources where id=job.source_id);
  assert not exists(select 1 from public.ai_estimate_examples where source_id=job.source_id),'local extraction never auto-approves';
  assert not public.ai_estimate_finish_extraction(job.id,job.attempt,job.last_run_id,result),'replayed local finish is ignored';
  assert public.ai_estimate_queue_jobs(current_setting('test.kinds_org')::uuid,false,1,3,
    current_setting('test.kinds_design')::uuid,'00000000-0000-4000-8000-000000003801')=0,'manual sources are not extraction jobs';
end;
$$;
reset role;

rollback;
