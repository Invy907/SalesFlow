begin;

alter table public.ai_estimate_example_lines drop constraint ai_estimate_example_lines_unit_price_check;

-- Human review is the only publishing boundary. Workers never publish examples.
-- All lifecycle writers lock the source before the job/extraction, and reject stale work.
create or replace function public.ai_estimate_validate_review(p_value jsonb, p_approval boolean)
returns void language plpgsql set search_path = public as $$
declare line jsonb;
begin
  if jsonb_typeof(p_value) is distinct from 'object' or jsonb_typeof(p_value->'lines') is distinct from 'array'
    or jsonb_array_length(p_value->'lines') not between 1 and 80 then
    raise exception '검수 명세는 1~80개여야 합니다.' using errcode = '22023';
  end if;
  if coalesce(p_value->>'currency', 'JPY') <> 'JPY'
    or coalesce(p_value->>'taxMode', 'unknown') not in ('included','excluded','unknown') then
    raise exception '지원되지 않는 통화 또는 세금 기준입니다.' using errcode = '22023';
  end if;
  if p_approval and coalesce(p_value->>'taxMode','unknown') not in ('included','excluded') then
    raise exception '세금 포함 여부를 확인해 주세요.' using errcode='22023';
  end if;
  if length(coalesce(p_value->>'clientName',''))>255 or length(coalesce(p_value->>'subject',''))>70
    or length(coalesce(p_value->>'templateMessage',''))>2000 or length(coalesce(p_value->>'remarks',''))>5000
    or length(coalesce(p_value->>'rawText',''))>100000 then
    raise exception '검수 내용이 허용된 길이를 초과했습니다.' using errcode='22023';
  end if;
  for line in select value from jsonb_array_elements(p_value->'lines') loop
    if nullif(btrim(line->>'name'),'') is null or length(line->>'name') > 255
      or length(coalesce(line->>'unit',''))>50 or length(coalesce(line->>'reason',''))>500
      or (line->>'unitPrice')::numeric <> trunc((line->>'unitPrice')::numeric)
      or (line->>'qty')::numeric <> round((line->>'qty')::numeric,4)
      or coalesce((line->>'qty')::numeric, -1) < 0
      or line->>'unitPrice' is null
      or abs((line->>'unitPrice')::numeric) > 999999999999
      or (line->>'qty')::numeric > 999999
      or (line->>'unitPrice')::numeric > 999999999999
      or coalesce(line->>'taxCategory','') not in ('follow_company','standard_10','reduced_8','standard_8','exempt','standard_5')
      or (p_approval and (line->>'taxCategory'='follow_company' or (line->>'qty')::numeric <= 0 or (line->>'unitPrice')::numeric = 0)) then
      raise exception '품목명, 수량, 단가와 세금 구분을 확인해 주세요.' using errcode = '22023';
    end if;
  end loop;
  if p_approval and (select sum((value->>'qty')::numeric*(value->>'unitPrice')::numeric) from jsonb_array_elements(p_value->'lines')) <= 0 then
    raise exception '승인할 견적의 합계는 0보다 커야 합니다.' using errcode='22023';
  end if;
end;
$$;
revoke all on function public.ai_estimate_validate_review(jsonb,boolean) from public, anon, authenticated;

-- Invalidating at the DB boundary also covers deletion/exclusion outside the UI.
create or replace function public.ai_estimate_invalidate_source()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'DELETE' then
    delete from public.ai_estimate_examples where source_id = old.id;
    perform public.ai_estimate_rebuild_price_stats(old.organization_id);
    return old;
  end if;
  if new.status <> 'approved' or new.visibility is distinct from old.visibility then
    delete from public.ai_estimate_examples where source_id = new.id;
    if new.status = 'excluded' then
      update public.ai_estimate_jobs set status='rejected', locked_at=null, locked_by=null,
        next_retry_at=null, finished_at=now() where source_id=new.id;
    elsif old.status='excluded' and new.status='review_required' then
      update public.ai_estimate_jobs set status='needs_review', locked_at=null, locked_by=null,
        next_retry_at=null, last_error_code=null, last_error_class=null, finished_at=now() where source_id=new.id;
    end if;
    if old.status = 'approved' then
      perform public.ai_estimate_rebuild_price_stats(new.organization_id);
    end if;
  end if;
  return new;
end;
$$;
create trigger ai_estimate_source_invalidate_update after update of status,visibility
  on public.ai_estimate_sources for each row execute function public.ai_estimate_invalidate_source();
create trigger ai_estimate_source_invalidate_delete before delete
  on public.ai_estimate_sources for each row execute function public.ai_estimate_invalidate_source();
revoke all on function public.ai_estimate_invalidate_source() from public, anon, authenticated;

-- A direct human edit must not leave an older approved example searchable.
create or replace function public.ai_estimate_invalidate_edited_extraction()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  if new.extracted_data is distinct from old.extracted_data then
    update public.ai_estimate_sources set status='review_required', approved_by=null, approved_at=null
      where id=new.source_id and status='approved';
  end if;
  return new;
end;
$$;
create trigger ai_estimate_extraction_invalidates_index after update of extracted_data
  on public.ai_estimate_extractions for each row execute function public.ai_estimate_invalidate_edited_extraction();
revoke all on function public.ai_estimate_invalidate_edited_extraction() from public,anon,authenticated;

create or replace function public.ai_estimate_save_review(
  p_source_id uuid, p_extraction jsonb, p_expected_updated_at timestamptz
) returns jsonb language plpgsql security definer set search_path=public as $$
declare source public.ai_estimate_sources; previous jsonb;
begin
  select * into source from public.ai_estimate_sources where id=p_source_id for update;
  if not found or not public.auth_has_role_in_org(source.organization_id,array['owner','admin','member']::public.member_role[])
    or (source.uploaded_by <> auth.uid() and not public.auth_has_role_in_org(source.organization_id,array['owner','admin']::public.member_role[])) then
    raise exception '검수 권한이 없습니다.' using errcode='42501';
  end if;
  if source.status not in ('review_required','approved','failed') then
    raise exception '처리 완료 후 검수해 주세요.' using errcode='22023';
  end if;
  if p_expected_updated_at is null or source.updated_at is distinct from p_expected_updated_at then
    raise exception '다른 작업으로 자료가 변경되었습니다. 새로고침 후 다시 검수해 주세요.' using errcode='40001';
  end if;
  perform public.ai_estimate_validate_review(p_extraction,false);
  if nullif(p_extraction->>'clientId','') is not null and not exists (
    select 1 from public.clients where id=(p_extraction->>'clientId')::uuid and organization_id=source.organization_id
  ) then raise exception '거래처가 같은 조직에 속하지 않습니다.' using errcode='42501'; end if;
  select extracted_data into previous from public.ai_estimate_extractions where source_id=p_source_id;
  update public.ai_estimate_sources set status='review_required',approved_by=null,approved_at=null,error_message=null where id=p_source_id;
  insert into public.ai_estimate_extractions(organization_id,source_id,extracted_data,raw_text,confidence,source_of_truth)
  values(source.organization_id,p_source_id,p_extraction,p_extraction->>'rawText',(p_extraction->>'confidence')::numeric,'human')
  on conflict(source_id) do update set extracted_data=excluded.extracted_data,raw_text=excluded.raw_text,confidence=excluded.confidence,source_of_truth='human';
  if previous is distinct from p_extraction then
    insert into public.ai_estimate_review_edits(organization_id,source_id,edited_by,field_path,before_value,after_value,reason)
      values(source.organization_id,p_source_id,auth.uid(),'$',previous,p_extraction,'manual-review-save');
  end if;
  update public.ai_estimate_jobs set status='needs_review',locked_at=null,locked_by=null,next_retry_at=null,
    finished_at=now() where source_id=p_source_id;
  return p_extraction || jsonb_build_object('updatedAt',(select updated_at from public.ai_estimate_sources where id=p_source_id));
end;
$$;
revoke all on function public.ai_estimate_save_review(uuid,jsonb,timestamptz) from public,anon;
grant execute on function public.ai_estimate_save_review(uuid,jsonb,timestamptz) to authenticated;

create or replace function public.ai_estimate_approve_source(
  p_source_id uuid, p_extraction jsonb, p_expected_updated_at timestamptz
) returns uuid language plpgsql security definer set search_path=public as $$
declare source public.ai_estimate_sources; previous jsonb; example_id uuid; search_text text; line jsonb; n integer:=0;
begin
  select * into source from public.ai_estimate_sources where id=p_source_id for update;
  if not found or not public.auth_has_role_in_org(source.organization_id,array['owner','admin']::public.member_role[]) then
    raise exception '조직 관리자만 승인할 수 있습니다.' using errcode='42501';
  end if;
  select extracted_data into previous from public.ai_estimate_extractions where source_id=p_source_id;
  select id into example_id from public.ai_estimate_examples where source_id=p_source_id;
  -- Network retries and two approvers submitting identical data are idempotent.
  if source.status='approved' and previous=p_extraction and example_id is not null then return example_id; end if;
  if source.status not in ('review_required','approved') then
    raise exception '검수 가능한 자료만 승인할 수 있습니다.' using errcode='22023';
  end if;
  if p_expected_updated_at is null or source.updated_at is distinct from p_expected_updated_at then
    raise exception '다른 작업으로 자료가 변경되었습니다. 새로고침 후 다시 승인해 주세요.' using errcode='40001';
  end if;
  perform public.ai_estimate_validate_review(p_extraction,true);
  if nullif(p_extraction->>'clientId','') is not null and not exists (
    select 1 from public.clients where id=(p_extraction->>'clientId')::uuid and organization_id=source.organization_id
  ) then raise exception '거래처가 같은 조직에 속하지 않습니다.' using errcode='42501'; end if;
  insert into public.ai_estimate_extractions(organization_id,source_id,extracted_data,raw_text,confidence,source_of_truth)
    values(source.organization_id,p_source_id,p_extraction,p_extraction->>'rawText',(p_extraction->>'confidence')::numeric,'human')
    on conflict(source_id) do update set extracted_data=excluded.extracted_data,raw_text=excluded.raw_text,confidence=excluded.confidence,source_of_truth='human';
  if previous is distinct from p_extraction then
    insert into public.ai_estimate_review_edits(organization_id,source_id,edited_by,field_path,before_value,after_value,reason)
      values(source.organization_id,p_source_id,auth.uid(),'$',previous,p_extraction,'manual-approval');
  end if;
  -- Use a new identity when evidence changes, so stale suggestion evidence cannot refer to revised facts.
  delete from public.ai_estimate_examples where source_id=p_source_id;
  select left(concat_ws(' ',p_extraction->>'clientName',p_extraction->>'subject',p_extraction->>'templateMessage',p_extraction->>'remarks',
    (select string_agg(concat_ws(' ',value->>'name',value->>'reason'),' ') from jsonb_array_elements(p_extraction->'lines'))),50000) into search_text;
  insert into public.ai_estimate_examples(organization_id,source_id,client_id,client_name,visibility,owner_user_id,subject,issue_date,
    currency,tax_mode,template_message,remarks,search_text,approved_by)
    values(source.organization_id,p_source_id,nullif(p_extraction->>'clientId','')::uuid,nullif(p_extraction->>'clientName',''),source.visibility,
      source.uploaded_by,nullif(p_extraction->>'subject',''),nullif(p_extraction->>'issueDate','')::date,coalesce(p_extraction->>'currency','JPY'),
      coalesce(p_extraction->>'taxMode','unknown'),p_extraction->>'templateMessage',p_extraction->>'remarks',search_text,auth.uid()) returning id into example_id;
  for line in select value from jsonb_array_elements(p_extraction->'lines') loop
    n:=n+1;
    insert into public.ai_estimate_example_lines(organization_id,example_id,line_no,name,normalized_name,qty,unit,normalized_unit,unit_price,tax_category,confidence,raw_item_name,raw_unit)
      values(source.organization_id,example_id,n,line->>'name',lower(regexp_replace(btrim(normalize(line->>'name',NFKC)),'\s+',' ','g')),
        (line->>'qty')::numeric,nullif(line->>'unit',''),nullif(btrim(normalize(line->>'unit',NFKC)),''),(line->>'unitPrice')::numeric,
        (line->>'taxCategory')::public.tax_category,(line->>'confidence')::numeric,line->>'name',line->>'unit');
    -- Small per-line chunks retain document context without silently truncating an 80-line example in the embedder.
    insert into public.ai_estimate_chunks(organization_id,example_id,chunk_index,content)
      values(source.organization_id,example_id,n-1,concat_ws(' ',p_extraction->>'clientName',p_extraction->>'subject',line->>'name',line->>'reason',line->>'unit'));
  end loop;
  update public.ai_estimate_sources set status='approved',approved_by=auth.uid(),approved_at=now(),error_message=null where id=p_source_id;
  update public.ai_estimate_jobs set status='approved',review_reasons='{}',locked_at=null,locked_by=null,next_retry_at=null,
    finished_at=now(),last_error_code=null,last_error_class=null where source_id=p_source_id;
  perform public.ai_estimate_rebuild_price_stats(source.organization_id);
  return example_id;
end;
$$;
revoke all on function public.ai_estimate_approve_source(uuid,jsonb,timestamptz) from public,anon;
grant execute on function public.ai_estimate_approve_source(uuid,jsonb,timestamptz) to authenticated;

-- Keyless mode creates an editable scaffold only once. Existing human/AI review is preserved.
create or replace function public.ai_estimate_prepare_manual_review(p_source_id uuid,p_extraction jsonb)
returns boolean language plpgsql security definer set search_path=public as $$
declare source public.ai_estimate_sources;
begin
  select * into source from public.ai_estimate_sources where id=p_source_id for update;
  if not found or source.status in ('approved','excluded') then return false; end if;
  if exists(select 1 from public.ai_estimate_jobs where source_id=p_source_id and status in ('extracting','extracted','validating')
    and locked_at > now()-interval '15 minutes') then return false; end if;
  insert into public.ai_estimate_extractions(organization_id,source_id,extracted_data,confidence,provider,source_of_truth)
    values(source.organization_id,p_source_id,p_extraction,0,'manual-review','legacy') on conflict(source_id) do nothing;
  update public.ai_estimate_sources set status='review_required',error_message=null where id=p_source_id;
  update public.ai_estimate_jobs set status='needs_review',review_reasons=array['manual_review_required'],
    locked_at=null,locked_by=null,next_retry_at=null,finished_at=now() where source_id=p_source_id;
  return true;
end;
$$;
revoke all on function public.ai_estimate_prepare_manual_review(uuid,jsonb) from public,anon,authenticated;
grant execute on function public.ai_estimate_prepare_manual_review(uuid,jsonb) to service_role;

create or replace function public.ai_estimate_queue_jobs(p_organization_id uuid,p_retry_only boolean,p_limit integer,p_max_attempt integer,p_source_id uuid default null,p_actor_user_id uuid default null,p_force_retry boolean default false)
returns integer language plpgsql security definer set search_path=public as $$
declare candidate record; queued integer:=0; source public.ai_estimate_sources;
begin
  if not exists(select 1 from public.organization_members where organization_id=p_organization_id and user_id=p_actor_user_id and role in ('owner','admin','member')) then
    raise exception '조직 처리 권한이 없습니다.' using errcode='42501';
  end if;
  for source in select s.* from public.ai_estimate_sources s
    where s.organization_id=p_organization_id and s.status not in ('approved','excluded') and s.source_type='upload'
      and (p_source_id is null or s.id=p_source_id)
      and (s.visibility='organization' or (s.uploaded_by=p_actor_user_id and exists(select 1 from public.ai_estimate_settings setting where setting.organization_id=p_organization_id and setting.allow_private_sources)))
      and not exists(select 1 from public.ai_estimate_extractions e where e.source_id=s.id and e.source_of_truth='human')
    order by s.created_at for update skip locked loop
    select * into candidate from public.ai_estimate_jobs where source_id=source.id for update;
    if candidate.status in ('extracting','extracted','validating') and candidate.locked_at < now()-interval '15 minutes' then
      update public.ai_estimate_jobs set status=case when attempt<max_attempt then 'failed_retryable' else 'failed_permanent' end,
        locked_at=null,locked_by=null,last_error_class='timeout',last_error_code='worker_lease_expired' where id=candidate.id;
      candidate.status:=case when candidate.attempt<candidate.max_attempt then 'failed_retryable' else 'failed_permanent' end;
      update public.ai_estimate_sources set status='failed',error_message='worker_lease_expired' where id=source.id;
    end if;
    if candidate.status='queued' or (candidate.status='uploaded' and not p_retry_only)
      or (candidate.status='failed_retryable' and candidate.attempt < candidate.max_attempt and (candidate.next_retry_at is null or candidate.next_retry_at<=now()))
      or (p_force_retry and p_source_id is not null and candidate.status in ('failed_retryable','failed_permanent','needs_review')) then
      update public.ai_estimate_jobs set status='queued',max_attempt=case when p_force_retry then greatest(candidate.max_attempt,candidate.attempt+1) else greatest(candidate.max_attempt,1,least(p_max_attempt,10)) end,
        next_retry_at=null,locked_at=null,locked_by=null,finished_at=null,last_error_code=null,last_error_class=null where id=candidate.id;
      update public.ai_estimate_sources set status='processing',error_message=null where id=source.id;
      queued:=queued+1;
      if p_limit is not null and queued>=p_limit then exit; end if;
    end if;
  end loop;
  return queued;
end;
$$;
revoke all on function public.ai_estimate_queue_jobs(uuid,boolean,integer,integer,uuid,uuid,boolean) from public,anon,authenticated;
grant execute on function public.ai_estimate_queue_jobs(uuid,boolean,integer,integer,uuid,uuid,boolean) to service_role;

-- Optional source filter prevents a one-file UI retry from consuming an unrelated queued file.
drop function public.ai_estimate_claim_jobs(uuid,uuid,text,integer);
create function public.ai_estimate_claim_jobs(p_organization_id uuid,p_run_id uuid,p_worker text,p_limit integer,p_source_id uuid)
returns setof public.ai_estimate_jobs language plpgsql security definer set search_path=public as $$
begin
  if not exists(select 1 from public.ai_estimate_batch_runs where id=p_run_id and organization_id=p_organization_id and status='running') then
    raise exception '배치 실행 범위가 잘못되었습니다.' using errcode='42501';
  end if;
  return query with candidates as (
    select job.id from public.ai_estimate_jobs job join public.ai_estimate_sources source on source.id=job.source_id
    where job.organization_id=p_organization_id and source.organization_id=p_organization_id
      and source.status='processing' and source.source_type='upload' and job.status='queued' and job.attempt<job.max_attempt
      and (p_source_id is null or source.id=p_source_id)
      and (source.visibility='organization' or source.uploaded_by=(select created_by from public.ai_estimate_batch_runs where id=p_run_id))
      and not exists(select 1 from public.ai_estimate_extractions e where e.source_id=source.id and e.source_of_truth='human')
      and (job.next_retry_at is null or job.next_retry_at<=now()) order by job.created_at
    for update of job skip locked limit greatest(1,least(coalesce(p_limit,1),16))
  ) update public.ai_estimate_jobs job set status='extracting',attempt=job.attempt+1,last_run_id=p_run_id,
    locked_at=now(),locked_by=left(p_worker,200),started_at=coalesce(job.started_at,now()) from candidates
    where job.id=candidates.id returning job.*;
end;
$$;
revoke all on function public.ai_estimate_claim_jobs(uuid,uuid,text,integer,uuid) from public,anon,authenticated;
grant execute on function public.ai_estimate_claim_jobs(uuid,uuid,text,integer,uuid) to service_role;

-- Store provider output and change the job/source atomically; late workers cannot overwrite human review.
create function public.ai_estimate_finish_extraction(p_job_id uuid,p_attempt integer,p_run_id uuid,p_result jsonb)
returns boolean language plpgsql security definer set search_path=public as $$
declare source public.ai_estimate_sources; job public.ai_estimate_jobs; run_id uuid; succeeded boolean; target text;
begin
  select s.* into source from public.ai_estimate_sources s join public.ai_estimate_jobs j on j.source_id=s.id where j.id=p_job_id for update of s;
  if not found or source.status in ('approved','excluded') then return false; end if;
  select * into job from public.ai_estimate_jobs where id=p_job_id for update;
  if job.attempt<>p_attempt or job.last_run_id is distinct from p_run_id or job.status not in ('extracting','extracted','validating')
    or exists(select 1 from public.ai_estimate_extractions where source_id=source.id and source_of_truth='human') then return false; end if;
  succeeded:=p_result->>'outcome'='succeeded';
  insert into public.ai_estimate_extraction_runs(organization_id,source_id,batch_run_id,provider,model,prompt_version,extraction_version,attempt,
    raw_output,normalized_output,confidence,outcome,error_code,error_class,input_tokens,output_tokens,estimated_cost_micro_usd,latency_ms)
  values(source.organization_id,source.id,p_run_id,'gemini',p_result->>'model',p_result->>'promptVersion',p_result->>'extractionVersion',p_attempt,
    p_result->'rawOutput',p_result->'normalized',(p_result->>'confidence')::numeric,p_result->>'outcome',p_result->>'errorCode',p_result->>'errorClass',
    (p_result->>'inputTokens')::integer,(p_result->>'outputTokens')::integer,(p_result->>'estimatedCostMicroUsd')::integer,(p_result->>'latencyMs')::integer)
    returning id into run_id;
  if succeeded then
    insert into public.ai_estimate_extractions(organization_id,source_id,extracted_data,raw_text,confidence,provider,model,extraction_run_id,prompt_version,extraction_version,source_of_truth)
      values(source.organization_id,source.id,p_result->'reviewExtraction','',(p_result->>'confidence')::numeric,'gemini',p_result->>'model',run_id,
        p_result->>'promptVersion',p_result->>'extractionVersion','ai')
      on conflict(source_id) do update set extracted_data=excluded.extracted_data,raw_text=excluded.raw_text,confidence=excluded.confidence,
        provider=excluded.provider,model=excluded.model,extraction_run_id=excluded.extraction_run_id,prompt_version=excluded.prompt_version,
        extraction_version=excluded.extraction_version,source_of_truth='ai';
    target:='needs_review';
  else
    target:=case when coalesce((p_result->>'retryable')::boolean,false) and job.attempt<job.max_attempt then 'failed_retryable' else 'failed_permanent' end;
  end if;
  update public.ai_estimate_jobs set status=target,review_reasons=case when succeeded then array(select jsonb_array_elements_text(p_result->'reviewReasons')) else review_reasons end,
    locked_at=null,locked_by=null,finished_at=now(),last_error_code=p_result->>'errorCode',last_error_class=p_result->>'errorClass',
    next_retry_at=case when target='failed_retryable' then now()+make_interval(secs=>least(60,power(2,job.attempt)::integer)) else null end where id=p_job_id;
  update public.ai_estimate_sources set status=case when succeeded then 'review_required' else 'failed' end,error_message=p_result->>'errorCode' where id=source.id;
  return true;
end;
$$;
revoke all on function public.ai_estimate_finish_extraction(uuid,integer,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.ai_estimate_finish_extraction(uuid,integer,uuid,jsonb) to service_role;

-- Embedding completion is conditional on the approved version still existing.
create function public.ai_estimate_save_embedding(p_chunk_id uuid,p_organization_id uuid,p_content text,p_vector text,p_model text)
returns boolean language plpgsql security definer set search_path=public,extensions as $$
declare source public.ai_estimate_sources; chunk public.ai_estimate_chunks;
begin
  select s.* into source from public.ai_estimate_sources s join public.ai_estimate_examples e on e.source_id=s.id
    join public.ai_estimate_chunks c on c.example_id=e.id where c.id=p_chunk_id and s.organization_id=p_organization_id and e.organization_id=p_organization_id
      and c.organization_id=p_organization_id and s.status='approved' for update of s;
  if not found then return false; end if;
  select * into chunk from public.ai_estimate_chunks where id=p_chunk_id and content=p_content for update;
  if not found then return false; end if;
  update public.ai_estimate_chunks set embedding_vector=p_vector::extensions.vector(1536),embedding_dim=1536,embedding_model=p_model where id=p_chunk_id;
  if not exists(select 1 from public.ai_estimate_chunks where example_id=chunk.example_id and (embedding_vector is null or embedding_model<>p_model)) then
    update public.ai_estimate_jobs set status='indexed',finished_at=now() where source_id=source.id and status in ('approved','indexing','indexed');
  end if;
  return true;
end;
$$;
revoke all on function public.ai_estimate_save_embedding(uuid,uuid,text,text,text) from public,anon,authenticated;
grant execute on function public.ai_estimate_save_embedding(uuid,uuid,text,text,text) to service_role;

-- Preserve the earlier service-worker signature without ambiguous default overloads.
create function public.ai_estimate_claim_jobs(p_organization_id uuid,p_run_id uuid,p_worker text,p_limit integer default 1)
returns setof public.ai_estimate_jobs language sql security definer set search_path=public as $$
  select * from public.ai_estimate_claim_jobs(p_organization_id,p_run_id,p_worker,p_limit,null::uuid);
$$;
revoke all on function public.ai_estimate_claim_jobs(uuid,uuid,text,integer) from public,anon,authenticated;
grant execute on function public.ai_estimate_claim_jobs(uuid,uuid,text,integer) to service_role;

-- Import issued documents in one transaction, preserving their snapshot and line order.
create function public.ai_estimate_import_document(p_estimate_id uuid)
returns uuid language plpgsql security definer set search_path=public as $$
declare doc public.estimates; source_id uuid; extraction jsonb; lines jsonb; client_name text;
begin
  select * into doc from public.estimates where id=p_estimate_id and deleted_at is null for update;
  if not found or not public.auth_has_role_in_org(doc.organization_id,array['owner','admin','member']::public.member_role[]) then
    raise exception '견적을 가져올 권한이 없습니다.' using errcode='42501';
  end if;
  if doc.status not in ('issued','sent','confirmed','overdue') and doc.issue_marked_at is null then
    raise exception '발행한 견적만 AI 자료로 가져올 수 있습니다.' using errcode='22023';
  end if;
  select id into source_id from public.ai_estimate_sources where organization_id=doc.organization_id
    and imported_estimate_id=doc.id and status<>'excluded';
  if found then return source_id; end if;
  select coalesce(nullif(doc.recipient_snapshot->>'clientName',''),nullif(doc.recipient_snapshot->>'companyName',''),
    nullif(doc.recipient_snapshot->>'name',''),(select name from public.clients where id=doc.client_id and organization_id=doc.organization_id),'') into client_name;
  select jsonb_agg(jsonb_build_object('name',name_snapshot,'qty',qty,'unit',coalesce(unit_snapshot,''),'unitPrice',unit_price_snapshot,
    'taxCategory',case when doc.tax_display='exempt' then 'exempt' when tax_category<>'follow_company' then tax_category::text
      when tax_rate_snapshot=0 then 'exempt' when tax_rate_snapshot=0.05 then 'standard_5' when tax_rate_snapshot=0.08 then 'standard_8' when tax_rate_snapshot=0.1 then 'standard_10' else 'follow_company' end,
    'confidence',1,'reason','SalesFlow 기존 견적에서 가져옴') order by line_no) into lines
    from public.estimate_line_items where document_id=doc.id;
  extraction:=jsonb_build_object('clientId',doc.client_id,'clientName',client_name,'subject',coalesce(doc.subject,''),'issueDate',doc.issue_date,
    'currency','JPY','taxMode',case when doc.tax_display='included' then 'included' else 'excluded' end,
    'templateMessage',coalesce(doc.template_message,''),'remarks',coalesce(doc.remarks,''),'rawText','','confidence',1,'lines',coalesce(lines,'[]'::jsonb),'warnings','[]'::jsonb);
  perform public.ai_estimate_validate_review(extraction,false);
  insert into public.ai_estimate_sources(organization_id,source_type,title,imported_estimate_id,visibility,status,uploaded_by)
    values(doc.organization_id,'estimate',coalesce(nullif(doc.subject,''),doc.document_number),doc.id,'organization','review_required',auth.uid()) returning id into source_id;
  insert into public.ai_estimate_extractions(organization_id,source_id,extracted_data,confidence,provider,model,source_of_truth)
    values(doc.organization_id,source_id,extraction,1,'salesflow','existing-estimate','legacy');
  return source_id;
end;
$$;
revoke all on function public.ai_estimate_import_document(uuid) from public,anon;
grant execute on function public.ai_estimate_import_document(uuid) to authenticated;

-- Durable file-purge outbox. A storage failure remains retryable; approved examples survive.
alter table public.ai_estimate_sources add column file_purge_path text, add column file_purged_at timestamptz;
alter table public.ai_estimate_sources drop constraint ai_estimate_source_file_required;
alter table public.ai_estimate_sources add constraint ai_estimate_source_file_required check (
  (source_type='upload' and mime_type is not null and (storage_path is not null or file_purge_path is not null or file_purged_at is not null))
  or (source_type='estimate' and imported_estimate_id is not null)
);
create function public.ai_estimate_claim_expired_files(p_limit integer default 10)
returns table(source_id uuid,organization_id uuid,storage_path text)
language plpgsql security definer set search_path=public as $$
begin
  return query with expired as (
    select s.id from public.ai_estimate_sources s left join public.ai_estimate_settings settings on settings.organization_id=s.organization_id
    where s.source_type='upload' and (s.file_purge_path is not null or (
      s.storage_path is not null and s.status in ('approved','excluded') and settings.source_retention_days is not null
      and s.created_at<now()-make_interval(days=>settings.source_retention_days)))
    order by s.created_at for update of s skip locked limit greatest(1,least(coalesce(p_limit,10),50))
  ) update public.ai_estimate_sources s set file_purge_path=coalesce(s.file_purge_path,s.storage_path),storage_path=null
    from expired where s.id=expired.id returning s.id,s.organization_id,s.file_purge_path;
end;
$$;
revoke all on function public.ai_estimate_claim_expired_files(integer) from public,anon,authenticated;
grant execute on function public.ai_estimate_claim_expired_files(integer) to service_role;
create function public.ai_estimate_complete_file_purge(p_source_id uuid,p_storage_path text)
returns void language sql security definer set search_path=public as $$
  update public.ai_estimate_sources set file_purge_path=null,file_purged_at=now()
    where id=p_source_id and file_purge_path=p_storage_path;
$$;
revoke all on function public.ai_estimate_complete_file_purge(uuid,text) from public,anon,authenticated;
grant execute on function public.ai_estimate_complete_file_purge(uuid,text) to service_role;

create function public.ai_estimate_pending_sources(p_limit integer default 3)
returns table(source_id uuid,uploaded_by uuid) language sql security definer set search_path=public as $$
  select s.id,s.uploaded_by from public.ai_estimate_sources s join public.ai_estimate_jobs j on j.source_id=s.id and j.organization_id=s.organization_id
  where s.source_type='upload' and s.storage_path is not null and s.status in ('processing','failed')
    and not exists(select 1 from public.ai_estimate_extractions e where e.source_id=s.id and e.source_of_truth='human')
    and exists(select 1 from public.organization_members m where m.organization_id=s.organization_id and m.user_id=s.uploaded_by and m.role in ('owner','admin','member'))
    and ((j.status in ('uploaded','queued') and j.attempt<j.max_attempt)
      or (j.status='failed_retryable' and j.attempt<j.max_attempt and (j.next_retry_at is null or j.next_retry_at<=now()))
      or (j.status in ('extracting','extracted','validating') and j.locked_at<now()-interval '15 minutes'))
  order by s.created_at limit greatest(1,least(coalesce(p_limit,3),3));
$$;
revoke all on function public.ai_estimate_pending_sources(integer) from public,anon,authenticated;
grant execute on function public.ai_estimate_pending_sources(integer) to service_role;

create function public.ai_estimate_preserve_source_scope()
returns trigger language plpgsql set search_path=public as $$
begin
  if new.organization_id is distinct from old.organization_id or new.uploaded_by is distinct from old.uploaded_by then
    raise exception '등록 자료의 조직과 소유자는 변경할 수 없습니다.' using errcode='42501';
  end if;
  if new.visibility is distinct from old.visibility and old.status='approved' then
    new.status:='review_required'; new.approved_by:=null; new.approved_at:=null;
  end if;
  return new;
end;
$$;
create trigger ai_estimate_source_scope before update of organization_id,uploaded_by,visibility
  on public.ai_estimate_sources for each row execute function public.ai_estimate_preserve_source_scope();
revoke all on function public.ai_estimate_preserve_source_scope() from public,anon,authenticated;

commit;
