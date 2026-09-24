-- Atomic document/evidence saves and direct-link boundaries. All synthetic data rolls back.
begin;
insert into auth.users(id,instance_id,aud,role,email,raw_user_meta_data) values
('00000000-0000-4000-8000-000000003851','00000000-0000-0000-0000-000000000000','authenticated','authenticated','evidence-owner@example.invalid','{}'),
('00000000-0000-4000-8000-000000003852','00000000-0000-0000-0000-000000000000','authenticated','authenticated','evidence-member@example.invalid','{}'),
('00000000-0000-4000-8000-000000003853','00000000-0000-0000-0000-000000000000','authenticated','authenticated','evidence-foreign@example.invalid','{}');
select set_config('test.evidence_org',(select organization_id::text from public.organization_members where user_id='00000000-0000-4000-8000-000000003851'),true);
select set_config('test.evidence_foreign_org',(select organization_id::text from public.organization_members where user_id='00000000-0000-4000-8000-000000003853'),true);
insert into public.organization_members(organization_id,user_id,role) values(current_setting('test.evidence_org')::uuid,'00000000-0000-4000-8000-000000003852','member');
insert into public.ai_estimate_suggestions(id,organization_id,requested_by,status,prompt_text)
select md5('evidence-'||n)::uuid,current_setting('test.evidence_org')::uuid,'00000000-0000-4000-8000-000000003851',
 case when n=2 then 'applied' when n=3 then 'dismissed' when n=4 then 'failed' else 'generated' end,'Synthetic prompt'
from generate_series(1,30) n;
insert into public.ai_estimate_suggestions(id,organization_id,requested_by) values
(md5('evidence-member')::uuid,current_setting('test.evidence_org')::uuid,'00000000-0000-4000-8000-000000003852'),
(md5('evidence-foreign')::uuid,current_setting('test.evidence_foreign_org')::uuid,'00000000-0000-4000-8000-000000003853');
insert into public.estimates(id,organization_id,document_number,issue_date,created_by,tax_display,tax_rounding) values
(md5('evidence-foreign-doc')::uuid,current_setting('test.evidence_foreign_org')::uuid,'QA-FOREIGN','2026-09-24','00000000-0000-4000-8000-000000003853','separate','round_down');
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000003851',true);
set local role authenticated;
do $$
declare header jsonb; lines jsonb; doc_id uuid; other_doc uuid; bad_id uuid; ids uuid[]; count_before bigint; applied_time timestamptz;
  source_id uuid; example_id uuid; extraction jsonb;
begin
  header:=jsonb_build_object('organization_id',current_setting('test.evidence_org')::uuid,'document_number','QA-AI-001',
    'issue_date','2026-09-24','subject','Original AI draft','tax_display','separate','tax_rounding','round_down','withholding_type','none');
  lines:='[{"name_snapshot":"Human reviewed design","qty":2,"unit_snapshot":"hour","unit_price_snapshot":250,"tax_category":"standard_10"}]';
  doc_id:=public.save_estimate_with_ai_evidence(header,lines,array[md5('evidence-1')::uuid,md5('evidence-2')::uuid]);
  perform set_config('test.evidence_document',doc_id::text,true);
  assert (select total from public.estimates where id=doc_id)=550;
  assert (select count(*) from public.ai_estimate_suggestions where estimate_id=doc_id and status='applied' and applied_at is not null)=2,
    'both generated and applied suggestions are committed with the document';
  select applied_at into applied_time from public.ai_estimate_suggestions where id=md5('evidence-1')::uuid;
  perform public.save_estimate_with_ai_evidence(header,lines,array[md5('evidence-1')::uuid],doc_id);
  assert (select applied_at from public.ai_estimate_suggestions where id=md5('evidence-1')::uuid)=applied_time,'repeated save is idempotent';
  perform public.save_estimate_with_ai_evidence(header||'{"subject":"Reviewed again"}',lines,array[md5('evidence-5')::uuid],doc_id);
  perform public.save_estimate_with_ai_evidence(header||'{"subject":"Reviewed again"}',lines,'{}',doc_id);
  assert (select count(*) from public.ai_estimate_suggestions where estimate_id=doc_id)=3,'new/empty selection keeps historical links';
  select count(*) into count_before from public.estimates;
  foreach bad_id in array array[md5('evidence-3')::uuid,md5('evidence-4')::uuid,md5('evidence-member')::uuid,
    md5('evidence-foreign')::uuid,md5('evidence-missing')::uuid,md5('evidence-1')::uuid] loop
    begin
      perform public.save_estimate_with_ai_evidence(header||'{"document_number":"QA-INVALID"}',lines,array[md5('evidence-6')::uuid,bad_id]);
      raise exception 'invalid suggestion created a document';
    exception when insufficient_privilege then assert sqlerrm='AI_SUGGESTION_UNAVAILABLE'; end;
    assert (select count(*) from public.estimates)=count_before,'failed create rolls back header and lines';
    assert (select estimate_id is null and status='generated' from public.ai_estimate_suggestions where id=md5('evidence-6')::uuid),'valid first suggestion was not partially linked';
  end loop;
  begin
    perform public.save_estimate_with_ai_evidence(header||'{"subject":"Must roll back"}',jsonb_set(lines,'{0,unit_price_snapshot}','999'),
      array[md5('evidence-member')::uuid],doc_id);
    raise exception 'invalid evidence edit succeeded';
  exception when insufficient_privilege then assert sqlerrm='AI_SUGGESTION_UNAVAILABLE'; end;
  assert (select subject='Reviewed again' and total=550 from public.estimates where id=doc_id),'failed edit preserves prior header and total';
  assert (select unit_price_snapshot=250 from public.estimate_line_items where document_id=doc_id),'failed edit preserves prior lines';
  begin
    perform public.save_estimate_with_ai_evidence(header,lines,array[md5('evidence-6')::uuid,md5('evidence-6')::uuid],doc_id);
    raise exception 'duplicate IDs accepted';
  exception when invalid_parameter_value then assert sqlerrm='AI_SUGGESTION_UNAVAILABLE'; end;
  begin
    perform public.save_estimate_with_ai_evidence(header,lines,array[null::uuid],doc_id);
    raise exception 'null ID accepted';
  exception when invalid_parameter_value then assert sqlerrm='AI_SUGGESTION_UNAVAILABLE'; end;
  begin
    perform public.save_estimate_with_ai_evidence(header,lines,array[array[md5('evidence-6')::uuid]],doc_id);
    raise exception 'multidimensional IDs accepted';
  exception when invalid_parameter_value then assert sqlerrm='AI_SUGGESTION_UNAVAILABLE'; end;
  select array_agg(md5('evidence-'||n)::uuid) into ids from generate_series(6,26) n;
  begin
    perform public.save_estimate_with_ai_evidence(header,lines,ids,doc_id);
    raise exception '21 IDs accepted';
  exception when invalid_parameter_value then assert sqlerrm='AI_SUGGESTION_UNAVAILABLE'; end;
  other_doc:=public.save_estimate_with_ai_evidence(header||'{"document_number":"QA-AI-002"}',lines,ids[1:20]);
  assert (select count(*) from public.ai_estimate_suggestions where estimate_id=other_doc)=20,'20 distinct IDs allowed';
  begin
    update public.ai_estimate_suggestions set estimate_id=other_doc where id=md5('evidence-1')::uuid;
    raise exception 'direct rebind accepted';
  exception when insufficient_privilege then assert sqlerrm='AI_SUGGESTION_UNAVAILABLE'; end;
  begin
    update public.ai_estimate_suggestions set estimate_id=null where id=md5('evidence-1')::uuid;
    raise exception 'direct unlink accepted';
  exception when insufficient_privilege then assert sqlerrm='AI_SUGGESTION_UNAVAILABLE'; end;
  begin
    update public.ai_estimate_suggestions set estimate_id=md5('evidence-foreign-doc')::uuid,status='applied' where id=md5('evidence-27')::uuid;
    raise exception 'cross-organization direct link accepted';
  exception when insufficient_privilege then assert sqlerrm='AI_SUGGESTION_UNAVAILABLE'; end;
  begin
    update public.ai_estimate_suggestions set requested_by='00000000-0000-4000-8000-000000003852' where id=md5('evidence-1')::uuid;
    raise exception 'linked provenance ownership changed';
  exception when insufficient_privilege then null; end;
  begin
    update public.ai_estimate_suggestions set status='generated' where id=md5('evidence-1')::uuid;
    raise exception 'linked provenance marked unapplied';
  exception when insufficient_privilege then assert sqlerrm='AI_SUGGESTION_UNAVAILABLE'; end;
  delete from public.estimates where id=other_doc;
  assert (select count(*) from public.ai_estimate_suggestions where id=any(ids[1:20]) and estimate_id is null)=20,'actual document deletion keeps FK SET NULL behavior';
  extraction:='{"documentKind":"work_scope","workDetails":"Approved synthetic work scope","lines":[],"taxMode":"unknown"}';
  source_id:=public.ai_estimate_create_manual_source(current_setting('test.evidence_org')::uuid,'Historical work scope','organization','{"documentKind":"work_scope"}',extraction);
  example_id:=public.ai_estimate_approve_source(source_id,extraction,(select updated_at from public.ai_estimate_sources s where s.id=source_id));
  insert into public.ai_estimate_suggestions(id,organization_id,requested_by,evidence_example_ids,suggestion_data)
    values(md5('evidence-context')::uuid,current_setting('test.evidence_org')::uuid,auth.uid(),array[example_id],jsonb_build_object('approvedContext','Approved synthetic work scope'));
  perform public.save_estimate_with_ai_evidence(header||'{"subject":"Reviewed again"}',lines,array[md5('evidence-context')::uuid],doc_id);
  update public.ai_estimate_sources s set status='excluded' where s.id=source_id;
  assert (select total=550 from public.estimates where id=doc_id),'excluding reference material never changes saved document';
  assert (select estimate_id=doc_id and evidence_example_ids=array[example_id] and suggestion_data->>'approvedContext'='Approved synthetic work scope'
    from public.ai_estimate_suggestions where id=md5('evidence-context')::uuid),'suggestion snapshot and saved provenance survive source exclusion';
  assert not has_function_privilege('anon','public.save_estimate_with_ai_evidence(jsonb,jsonb,uuid[],uuid)','execute');
end;
$$;
reset role;
rollback;
