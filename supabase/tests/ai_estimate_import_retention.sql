begin;
insert into auth.users(id,instance_id,aud,role,email,raw_user_meta_data) values
('00000000-0000-4000-8000-000000003541','00000000-0000-0000-0000-000000000000','authenticated','authenticated','ai-import-owner@example.invalid','{}');
select set_config('test.ai_org',(select organization_id::text from public.organization_members where user_id='00000000-0000-4000-8000-000000003541'),true);
insert into public.estimates(id,organization_id,document_number,subject,issue_date,tax_display,tax_rounding,recipient_snapshot,created_by)
values('00000000-0000-4000-8000-000000003551',current_setting('test.ai_org')::uuid,'AI-TEST-1','Imported quote','2026-09-20','included','round_down','{"clientName":"Historical snapshot customer"}','00000000-0000-4000-8000-000000003541');
insert into public.estimate_line_items(document_id,line_no,name_snapshot,qty,unit_snapshot,unit_price_snapshot,tax_category,tax_rate_snapshot)
values('00000000-0000-4000-8000-000000003551',2,'Discount',1,'',-20,'standard_10',0.1),
('00000000-0000-4000-8000-000000003551',1,'Design',2,'hour',100,'standard_10',0.1);
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000003541',true);
set local role authenticated;
do $$
declare imported uuid; again uuid; extraction jsonb;
begin
  begin
    perform public.ai_estimate_import_document('00000000-0000-4000-8000-000000003551');
    raise exception 'draft was imported';
  exception when invalid_parameter_value then null; end;
  update public.estimates set status='confirmed' where id='00000000-0000-4000-8000-000000003551';
  imported:=public.ai_estimate_import_document('00000000-0000-4000-8000-000000003551');
  again:=public.ai_estimate_import_document('00000000-0000-4000-8000-000000003551');
  assert imported=again,'duplicate import must preserve the source';
  select extracted_data into extraction from public.ai_estimate_extractions where source_id=imported;
  assert extraction->>'clientName'='Historical snapshot customer';
  assert extraction->>'currency'='JPY';
  assert extraction->>'taxMode'='included';
  assert extraction->'lines'->0->>'name'='Design','line_no order preserved';
  assert extraction->'lines'->1->>'unitPrice'='-20','discount preserved';
  assert not exists(select 1 from public.ai_estimate_examples where source_id=imported),'import is not approval';
  perform public.ai_estimate_approve_source(imported,extraction,(select updated_at from public.ai_estimate_sources where id=imported));
  assert exists(select 1 from public.ai_estimate_examples where source_id=imported);
end;
$$;
reset role;
insert into public.ai_estimate_settings(organization_id,source_retention_days) values(current_setting('test.ai_org')::uuid,30)
on conflict(organization_id) do update set source_retention_days=30;
insert into public.ai_estimate_sources(id,organization_id,source_type,title,storage_path,mime_type,uploaded_by,created_at,status) values
('00000000-0000-4000-8000-000000003561',current_setting('test.ai_org')::uuid,'upload','Approved original',current_setting('test.ai_org')||'/00000000-0000-4000-8000-000000003561/original.pdf','application/pdf','00000000-0000-4000-8000-000000003541',now()-interval '60 days','uploaded'),
('00000000-0000-4000-8000-000000003562',current_setting('test.ai_org')::uuid,'upload','Review original',current_setting('test.ai_org')||'/00000000-0000-4000-8000-000000003562/original.pdf','application/pdf','00000000-0000-4000-8000-000000003541',now()-interval '60 days','uploaded'),
('00000000-0000-4000-8000-000000003563',current_setting('test.ai_org')::uuid,'upload','Excluded original',current_setting('test.ai_org')||'/00000000-0000-4000-8000-000000003563/original.pdf','application/pdf','00000000-0000-4000-8000-000000003541',now()-interval '60 days','excluded');
set local role service_role;
do $$
declare extraction jsonb;
begin
  select e.extracted_data into extraction from public.ai_estimate_extractions e join public.ai_estimate_sources s on s.id=e.source_id
    where s.imported_estimate_id='00000000-0000-4000-8000-000000003551';
  perform public.ai_estimate_prepare_manual_review('00000000-0000-4000-8000-000000003561',extraction);
  perform public.ai_estimate_prepare_manual_review('00000000-0000-4000-8000-000000003562',extraction);
end;
$$;
reset role;
set local role authenticated;
select public.ai_estimate_approve_source('00000000-0000-4000-8000-000000003561',
  (select extracted_data from public.ai_estimate_extractions where source_id='00000000-0000-4000-8000-000000003561'),
  (select updated_at from public.ai_estimate_sources where id='00000000-0000-4000-8000-000000003561'));
reset role;
set local role service_role;
do $$
declare task record; count integer:=0;
begin
  for task in select * from public.ai_estimate_claim_expired_files(50) loop
    if task.organization_id=current_setting('test.ai_org')::uuid then count:=count+1; end if;
  end loop;
  assert count=2,'only approved/excluded original files may expire';
  assert (select storage_path from public.ai_estimate_sources where id='00000000-0000-4000-8000-000000003562')=current_setting('test.ai_org')||'/00000000-0000-4000-8000-000000003562/original.pdf','manual review original remains available';
  assert (select file_purge_path from public.ai_estimate_sources where id='00000000-0000-4000-8000-000000003561')=current_setting('test.ai_org')||'/00000000-0000-4000-8000-000000003561/original.pdf','failed storage deletion remains queued';
  perform public.ai_estimate_complete_file_purge('00000000-0000-4000-8000-000000003561','wrong-path');
  assert (select file_purged_at from public.ai_estimate_sources where id='00000000-0000-4000-8000-000000003561') is null;
  perform public.ai_estimate_complete_file_purge('00000000-0000-4000-8000-000000003561',current_setting('test.ai_org')||'/00000000-0000-4000-8000-000000003561/original.pdf');
  assert (select file_purged_at from public.ai_estimate_sources where id='00000000-0000-4000-8000-000000003561') is not null;
  assert exists(select 1 from public.ai_estimate_examples where source_id='00000000-0000-4000-8000-000000003561'),'purging the original must retain approved evidence';
  raise notice 'AI import and original retention checks passed';
end;
$$;
rollback;
