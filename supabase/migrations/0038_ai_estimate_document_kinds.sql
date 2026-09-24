begin;

-- A source remains one immutable registration/version; edits only change its reviewed content.
alter table public.ai_estimate_sources
  add column document_kind text not null default 'estimate' check (document_kind in ('estimate','price_list','design','work_scope')),
  add column project_name text not null default '' check (char_length(project_name)<=120),
  add column revision text not null default '' check (char_length(revision)<=50),
  add column valid_from date,
  add column valid_until date,
  add constraint ai_estimate_source_validity check (valid_from is null or valid_until is null or valid_from<=valid_until);
alter table public.ai_estimate_sources drop constraint ai_estimate_sources_source_type_check;
alter table public.ai_estimate_sources add constraint ai_estimate_sources_source_type_check check (source_type in ('upload','estimate','manual'));
alter table public.ai_estimate_sources drop constraint ai_estimate_source_file_required;
alter table public.ai_estimate_sources add constraint ai_estimate_source_file_required check (
  (source_type='upload' and mime_type is not null and (storage_path is not null or file_purge_path is not null or file_purged_at is not null))
  or (source_type='estimate' and imported_estimate_id is not null)
  or (source_type='manual' and imported_estimate_id is null and storage_path is null and file_purge_path is null and mime_type is null)
);
create index ai_estimate_sources_kind_validity_idx on public.ai_estimate_sources(organization_id,document_kind,status,valid_from,valid_until);
-- The same bytes may legitimately be registered for a new version or reference period.
drop index public.ai_estimate_sources_hash_uidx;
create unique index ai_estimate_sources_hash_uidx on public.ai_estimate_sources
  (organization_id,file_hash,document_kind,project_name,revision,coalesce(valid_from,'-infinity'::date),coalesce(valid_until,'infinity'::date))
  where file_hash is not null and status<>'excluded';

alter table public.ai_estimate_examples
  add column document_kind text not null default 'estimate' check (document_kind in ('estimate','price_list','design','work_scope')),
  add column project_name text not null default '' check (char_length(project_name)<=120),
  add column revision text not null default '' check (char_length(revision)<=50),
  add column valid_from date,
  add column if not exists valid_until date,
  add column original_valid_until date,
  add column work_details text not null default '' check (char_length(work_details)<=16000),
  add column assumptions text not null default '' check (char_length(assumptions)<=4000),
  add column exclusions text not null default '' check (char_length(exclusions)<=4000),
  add constraint ai_estimate_example_validity check (valid_from is null or valid_until is null or valid_from<=valid_until);

-- Preserve the older extracted estimate expiry before using valid_until as a source-version snapshot.
update public.ai_estimate_examples e set original_valid_until=e.valid_until, valid_from=s.valid_from, valid_until=s.valid_until
  from public.ai_estimate_sources s where s.id=e.source_id and s.organization_id=e.organization_id;

create function public.ai_estimate_preserve_source_metadata()
returns trigger language plpgsql set search_path=public as $$
begin
  if row(new.document_kind,new.project_name,new.revision,new.valid_from,new.valid_until)
    is distinct from row(old.document_kind,old.project_name,old.revision,old.valid_from,old.valid_until) then
    raise exception '자료 분류, 프로젝트, 버전과 유효기간은 변경할 수 없습니다. 새 자료로 등록해 주세요.' using errcode='42501';
  end if;
  return new;
end;
$$;
create trigger ai_estimate_source_metadata before update of document_kind,project_name,revision,valid_from,valid_until
  on public.ai_estimate_sources for each row execute function public.ai_estimate_preserve_source_metadata();
revoke all on function public.ai_estimate_preserve_source_metadata() from public,anon,authenticated;

-- Keep the approved snapshot bound to the registered source even for direct admin writes.
create function public.ai_estimate_bind_example_metadata()
returns trigger language plpgsql set search_path=public as $$
declare source public.ai_estimate_sources;
begin
  select * into source from public.ai_estimate_sources where id=new.source_id and organization_id=new.organization_id;
  if not found then raise exception '자료가 같은 조직에 속하지 않습니다.' using errcode='42501'; end if;
  new.document_kind:=source.document_kind; new.project_name:=source.project_name; new.revision:=source.revision;
  new.valid_from:=source.valid_from; new.valid_until:=source.valid_until;
  return new;
end;
$$;
create trigger ai_estimate_example_metadata before insert or update on public.ai_estimate_examples
  for each row execute function public.ai_estimate_bind_example_metadata();
revoke all on function public.ai_estimate_bind_example_metadata() from public,anon,authenticated;

create or replace function public.ai_estimate_is_source_file_path(p_org uuid,p_source uuid,p_path text)
returns boolean language sql immutable set search_path=public as $$
  select coalesce(p_path = any(array[
    p_org::text||'/'||p_source::text||'/original.pdf', p_org::text||'/'||p_source::text||'/original.png',
    p_org::text||'/'||p_source::text||'/original.jpg', p_org::text||'/'||p_source::text||'/original.jpeg',
    p_org::text||'/'||p_source::text||'/original.csv', p_org::text||'/'||p_source::text||'/original.xlsx',
    p_org::text||'/'||p_source::text||'/original.txt', p_org::text||'/'||p_source::text||'/original.md'
  ]),false);
$$;
update storage.buckets set allowed_mime_types=array['application/pdf','image/png','image/jpeg','text/csv',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','text/plain','text/markdown'], file_size_limit=20971520
  where id='ai-estimate-sources';

create or replace function public.ai_estimate_validate_review(p_value jsonb,p_approval boolean)
returns void language plpgsql set search_path=public as $$
declare line jsonb; kind text:=coalesce(p_value->>'documentKind','estimate'); context_only boolean;
begin
  if jsonb_typeof(p_value) is distinct from 'object' or kind not in ('estimate','price_list','design','work_scope')
    or jsonb_typeof(p_value->'lines') is distinct from 'array' or jsonb_array_length(p_value->'lines')>80 then
    raise exception '자료 분류와 0~80개 명세를 확인해 주세요.' using errcode='22023';
  end if;
  context_only:=kind in ('design','work_scope');
  if coalesce(p_value->>'currency','JPY')<>'JPY' or coalesce(p_value->>'taxMode','unknown') not in ('included','excluded','unknown') then
    raise exception '지원되지 않는 통화 또는 세금 기준입니다.' using errcode='22023';
  end if;
  if length(coalesce(p_value->>'clientName',''))>255 or length(coalesce(p_value->>'subject',''))>70
    or length(coalesce(p_value->>'templateMessage',''))>2000 or length(coalesce(p_value->>'remarks',''))>5000
    or length(coalesce(p_value->>'rawText',''))>100000 or length(coalesce(p_value->>'workDetails',''))>16000
    or length(coalesce(p_value->>'assumptions',''))>4000 or length(coalesce(p_value->>'exclusions',''))>4000 then
    raise exception '검수 내용이 허용된 길이를 초과했습니다.' using errcode='22023';
  end if;
  if context_only then
    if jsonb_array_length(p_value->'lines')<>0 or (p_approval and char_length(btrim(coalesce(p_value->>'workDetails','')))<3) then
      raise exception '설계·작업 자료는 가격 명세 없이 작업 내용을 3자 이상 입력해 주세요.' using errcode='22023';
    end if;
    return;
  end if;
  if p_approval and (jsonb_array_length(p_value->'lines')=0 or coalesce(p_value->>'taxMode','unknown') not in ('included','excluded')) then
    raise exception '가격 명세와 세금 포함 여부를 확인해 주세요.' using errcode='22023';
  end if;
  for line in select value from jsonb_array_elements(p_value->'lines') loop
    if jsonb_typeof(line) is distinct from 'object' or nullif(btrim(line->>'name'),'') is null or length(line->>'name')>255
      or length(coalesce(line->>'unit',''))>50 or length(coalesce(line->>'reason',''))>500
      or (line->>'unitPrice')::numeric<>trunc((line->>'unitPrice')::numeric)
      or (line->>'qty')::numeric<>round((line->>'qty')::numeric,4)
      or coalesce((line->>'qty')::numeric,-1)<0 or (line->>'qty')::numeric>999999
      or line->>'unitPrice' is null or abs((line->>'unitPrice')::numeric)>999999999999
      or coalesce(line->>'taxCategory','') not in ('follow_company','standard_10','reduced_8','standard_8','exempt','standard_5')
      or (p_approval and (line->>'taxCategory'='follow_company' or (line->>'qty')::numeric<=0 or (line->>'unitPrice')::numeric=0
        or (kind='price_list' and (line->>'unitPrice')::numeric<=0))) then
      raise exception '품목명, 수량, 단가와 세금 구분을 확인해 주세요.' using errcode='22023';
    end if;
  end loop;
  if p_approval and (select sum((value->>'qty')::numeric*(value->>'unitPrice')::numeric) from jsonb_array_elements(p_value->'lines'))<=0 then
    raise exception '승인할 가격 자료의 합계는 0보다 커야 합니다.' using errcode='22023';
  end if;
end;
$$;


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
  if coalesce(p_extraction->>'documentKind','estimate')<>source.document_kind then
    raise exception '자료 분류와 검수 내용이 일치하지 않습니다.' using errcode='22023';
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

create or replace function public.ai_estimate_approve_source(
  p_source_id uuid, p_extraction jsonb, p_expected_updated_at timestamptz
) returns uuid language plpgsql security definer set search_path=public as $$
declare source public.ai_estimate_sources; previous jsonb; example_id uuid; search_text text; line jsonb; n integer:=0; context_text text; offset_pos integer;
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
  if coalesce(p_extraction->>'documentKind','estimate')<>source.document_kind then
    raise exception '자료 분류와 검수 내용이 일치하지 않습니다.' using errcode='22023';
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
  select left(concat_ws(' ',p_extraction->>'clientName',p_extraction->>'subject',p_extraction->>'templateMessage',p_extraction->>'remarks',source.project_name,source.revision,
    p_extraction->>'workDetails',p_extraction->>'assumptions',p_extraction->>'exclusions',
    (select string_agg(concat_ws(' ',value->>'name',value->>'reason'),' ') from jsonb_array_elements(p_extraction->'lines'))),100000) into search_text;
  insert into public.ai_estimate_examples(organization_id,source_id,client_id,client_name,visibility,owner_user_id,subject,issue_date,
    currency,tax_mode,template_message,remarks,search_text,approved_by,work_details,assumptions,exclusions)
    values(source.organization_id,p_source_id,nullif(p_extraction->>'clientId','')::uuid,nullif(p_extraction->>'clientName',''),source.visibility,
      source.uploaded_by,nullif(p_extraction->>'subject',''),nullif(p_extraction->>'issueDate','')::date,coalesce(p_extraction->>'currency','JPY'),
      coalesce(p_extraction->>'taxMode','unknown'),p_extraction->>'templateMessage',p_extraction->>'remarks',search_text,auth.uid(),coalesce(p_extraction->>'workDetails',''),
      coalesce(p_extraction->>'assumptions',''),coalesce(p_extraction->>'exclusions','')) returning id into example_id;
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
  context_text:=concat_ws(E'\n',nullif(p_extraction->>'workDetails',''),nullif(p_extraction->>'assumptions',''),nullif(p_extraction->>'exclusions',''));
  if char_length(btrim(context_text))>0 then
    for offset_pos in select generate_series(1,char_length(context_text),1400) loop
      insert into public.ai_estimate_chunks(organization_id,example_id,chunk_index,content)
      values(source.organization_id,example_id,n,concat_ws(' ',source.project_name,source.revision,p_extraction->>'subject',substr(context_text,offset_pos,1600)));
      n:=n+1;
    end loop;
  end if;
  update public.ai_estimate_sources set status='approved',approved_by=auth.uid(),approved_at=now(),error_message=null where id=p_source_id;
  update public.ai_estimate_jobs set status='approved',review_reasons='{}',locked_at=null,locked_by=null,next_retry_at=null,
    finished_at=now(),last_error_code=null,last_error_class=null where source_id=p_source_id;
  perform public.ai_estimate_rebuild_price_stats(source.organization_id);
  return example_id;
end;
$$;


create function public.ai_estimate_create_manual_source(p_organization_id uuid,p_title text,p_visibility text,p_metadata jsonb,p_extraction jsonb)
returns uuid language plpgsql security definer set search_path=public as $$
declare source_id uuid; kind text:=coalesce(p_metadata->>'documentKind','estimate');
  project text:=btrim(coalesce(p_metadata->>'projectName','')); revision_label text:=btrim(coalesce(p_metadata->>'revision',''));
  starts date:=nullif(p_metadata->>'validFrom','')::date; ends date:=nullif(p_metadata->>'validUntil','')::date;
begin
  if auth.uid() is null or not public.auth_has_role_in_org(p_organization_id,array['owner','admin','member']::public.member_role[]) then
    raise exception '자료를 등록할 권한이 없습니다.' using errcode='42501';
  end if;
  if not coalesce((select enabled from public.ai_estimate_settings where organization_id=p_organization_id),true) then
    raise exception 'AI 견적 기능이 비활성화되어 있습니다.' using errcode='42501';
  end if;
  if jsonb_typeof(p_metadata) is distinct from 'object' or kind not in ('estimate','price_list','design','work_scope')
    or p_visibility not in ('organization','private') or p_visibility is null
    or nullif(btrim(p_title),'') is null or char_length(btrim(p_title))>255
    or char_length(project)>120 or char_length(revision_label)>50 or (starts is not null and ends is not null and starts>ends)
    or coalesce(p_extraction->>'documentKind','estimate')<>kind then
    raise exception '자료 제목, 분류, 버전과 유효기간을 확인해 주세요.' using errcode='22023';
  end if;
  perform public.ai_estimate_validate_review(p_extraction,false);
  if nullif(p_extraction->>'clientId','') is not null and not exists (
    select 1 from public.clients where id=(p_extraction->>'clientId')::uuid and organization_id=p_organization_id
  ) then raise exception '거래처가 같은 조직에 속하지 않습니다.' using errcode='42501'; end if;
  insert into public.ai_estimate_sources(organization_id,source_type,title,visibility,status,uploaded_by,document_kind,project_name,revision,valid_from,valid_until)
    values(p_organization_id,'manual',btrim(p_title),p_visibility,'review_required',auth.uid(),kind,project,revision_label,starts,ends) returning id into source_id;
  insert into public.ai_estimate_extractions(organization_id,source_id,extracted_data,raw_text,confidence,provider,source_of_truth)
    values(p_organization_id,source_id,p_extraction,p_extraction->>'rawText',(p_extraction->>'confidence')::numeric,'manual','human');
  return source_id;
end;
$$;
revoke all on function public.ai_estimate_create_manual_source(uuid,text,text,jsonb,jsonb) from public,anon;
grant execute on function public.ai_estimate_create_manual_source(uuid,text,text,jsonb,jsonb) to authenticated;

-- Selection is strict: neither a hidden/expired source nor a duplicate/null ID is silently discarded.
create function public.ai_estimate_eligible_examples_v2(p_organization_id uuid,p_allow_private boolean default false,
  p_source_ids uuid[] default '{}'::uuid[],p_as_of date default (now() at time zone 'Asia/Tokyo')::date,p_client_id uuid default null)
returns setof public.ai_estimate_examples language plpgsql stable security invoker set search_path=public as $$
declare ids uuid[]:=coalesce(p_source_ids,'{}'::uuid[]); matched integer; target_date date:=coalesce(p_as_of,(now() at time zone 'Asia/Tokyo')::date);
begin
  if cardinality(ids)>10 or coalesce(array_ndims(ids),1)>1 then
    raise exception 'AI_REFERENCE_UNAVAILABLE' using errcode='22023';
  end if;
  if array_position(ids,null) is not null
    or cardinality(ids)<>(select count(distinct id) from unnest(ids) id) then
    raise exception 'AI_REFERENCE_UNAVAILABLE' using errcode='22023';
  end if;
  if cardinality(ids)>0 then
    select count(*) into matched from public.ai_estimate_eligible_examples(p_organization_id,p_allow_private) e
      join public.ai_estimate_sources s on s.id=e.source_id and s.organization_id=e.organization_id
      where s.id=any(ids) and (s.document_kind<>'price_list' or e.client_id is null or e.client_id=p_client_id) and (s.valid_from is null or s.valid_from<=target_date) and (s.valid_until is null or s.valid_until>=target_date);
    if matched<>cardinality(ids) then raise exception 'AI_REFERENCE_UNAVAILABLE' using errcode='42501'; end if;
  end if;
  return query select e.* from public.ai_estimate_eligible_examples(p_organization_id,p_allow_private) e
    join public.ai_estimate_sources s on s.id=e.source_id and s.organization_id=e.organization_id
    where (cardinality(ids)=0 or s.id=any(ids)) and (s.document_kind<>'price_list' or e.client_id is null or e.client_id=p_client_id) and (s.valid_from is null or s.valid_from<=target_date) and (s.valid_until is null or s.valid_until>=target_date);
end;
$$;
revoke all on function public.ai_estimate_eligible_examples_v2(uuid,boolean,uuid[],date,uuid) from public,anon;
grant execute on function public.ai_estimate_eligible_examples_v2(uuid,boolean,uuid[],date,uuid) to authenticated,service_role;

create function public.ai_estimate_search_approved_v2(p_organization_id uuid,p_query_text text,p_query_embedding text default null,
  p_embedding_model text default null,p_client_id uuid default null,p_allow_private boolean default false,p_limit integer default 20,
  p_source_ids uuid[] default '{}'::uuid[],p_as_of date default (now() at time zone 'Asia/Tokyo')::date)
returns table(example_id uuid,keyword_score double precision,vector_score double precision,same_client boolean,example jsonb)
language plpgsql stable security invoker set search_path=public,extensions as $$
declare selected_mode boolean:=cardinality(coalesce(p_source_ids,'{}'::uuid[]))>0;
begin
  perform count(*) from public.ai_estimate_eligible_examples_v2(p_organization_id,p_allow_private,p_source_ids,p_as_of,p_client_id);
  return query
  with query as (select public.ai_estimate_search_terms(left(p_query_text,8000)) terms),
  eligible as materialized (select * from public.ai_estimate_eligible_examples_v2(p_organization_id,p_allow_private,p_source_ids,p_as_of,p_client_id)),
  lexical as (
    select e.id,(select count(*)::double precision from unnest(q.terms) term where term=any(e.retrieval_terms))/greatest(cardinality(q.terms),1) score
    from eligible e cross join query q where e.retrieval_terms && q.terms
  ), vectors as (
    select c.example_id id,greatest(0,1-min(c.embedding_vector <=> p_query_embedding::extensions.vector))::double precision score
    from public.ai_estimate_chunks c join eligible e on e.id=c.example_id
    where not selected_mode and c.organization_id=p_organization_id and p_query_embedding is not null and c.embedding_vector is not null
      and c.embedding_model=p_embedding_model and c.embedding_dim=1536 and extensions.vector_dims(p_query_embedding::extensions.vector)=1536
    group by c.example_id
  ), scored as (
    select e.*,case when selected_mode then 1::double precision else coalesce(l.score,0) end lexical_score,coalesce(v.score,0) semantic_score,
      coalesce(e.client_id=p_client_id,false) same_customer
    from eligible e left join lexical l on l.id=e.id left join vectors v on v.id=e.id
    where selected_mode or coalesce(l.score,0)>=0.25 or coalesce(v.score,0)>=0.65
  ), weighted as (
    select s.*,bool_or(semantic_score>=0.65) over () vector_used from scored s
  ), ranked as (
    select w.*,(case when vector_used then lexical_score*0.4+semantic_score*0.6 else lexical_score end)*(case when same_customer then 1.05 else 1 end) final_score
    from weighted w
  ), balanced as (
    select r.*,row_number() over(partition by (r.document_kind in ('design','work_scope')) order by r.final_score desc,r.id) category_rank
    from ranked r
  ), chosen as (
    select * from balanced b order by case when selected_mode then array_position(p_source_ids,b.source_id)::bigint else b.category_rank end,b.final_score desc,b.id
    limit case when selected_mode then 10 else greatest(1,least(coalesce(p_limit,20),100)) end
  )
  select r.id,r.lexical_score,r.semantic_score,r.same_customer,
    jsonb_build_object('id',r.id,'source_id',r.source_id,'source_title',s.title,'owner_user_id',r.owner_user_id,
      'document_kind',r.document_kind,'project_name',r.project_name,'revision',r.revision,'valid_from',r.valid_from,'valid_until',r.valid_until,
      'work_details',r.work_details,'assumptions',r.assumptions,'exclusions',r.exclusions,
      'currency',r.currency,'tax_mode',r.tax_mode,'client_id',r.client_id,'client_name',r.client_name,'subject',r.subject,'issue_date',r.issue_date,
      'template_message',r.template_message,'remarks',r.remarks,'search_text',r.search_text,'visibility',r.visibility,
      'ai_estimate_example_lines',coalesce((select jsonb_agg(jsonb_build_object('id',l.id,'name',l.name,'qty',l.qty,
        'unit',coalesce(l.normalized_unit,l.unit),'unit_price',l.unit_price,'tax_category',l.tax_category) order by l.line_no)
        from public.ai_estimate_example_lines l where l.example_id=r.id and l.organization_id=p_organization_id),'[]'::jsonb))
    from chosen r join public.ai_estimate_sources s on s.id=r.source_id and s.organization_id=p_organization_id
    order by case when selected_mode then array_position(p_source_ids,r.source_id)::bigint else r.category_rank end,r.final_score desc,r.id;
end;
$$;
revoke all on function public.ai_estimate_search_approved_v2(uuid,text,text,text,uuid,boolean,integer,uuid[],date) from public,anon;
grant execute on function public.ai_estimate_search_approved_v2(uuid,text,text,text,uuid,boolean,integer,uuid[],date) to authenticated,service_role;


create or replace function public.ai_estimate_rebuild_price_stats(p_organization_id uuid)
returns integer language plpgsql security definer set search_path = public as $$
declare inserted_count integer;
begin
  -- Approval/exclusion transactions also acquire this lock to serialize aggregates per organization.
  perform pg_advisory_xact_lock(hashtextextended(p_organization_id::text, 34));
  delete from public.ai_estimate_price_stats where organization_id = p_organization_id;
  insert into public.ai_estimate_price_stats (
    organization_id, client_id, normalized_name, display_name, sample_count, median_price, p25_price, p75_price,
    last_used_at, standard_item_id, currency, unit, tax_mode, tax_category, min_price, max_price
  )
  with per_document as (
    select line.organization_id, scope.client_id, line.normalized_name, min(line.name) display_name, e.id,
      percentile_cont(0.5) within group(order by line.unit_price) price, max(e.issue_date) issue_date,
      line.standard_item_id, e.currency, lower(normalize(trim(coalesce(line.normalized_unit, line.unit, '')), NFKC)) unit,
      e.tax_mode, line.tax_category
    from public.ai_estimate_example_lines line
    join public.ai_estimate_examples e on e.id = line.example_id and e.organization_id = line.organization_id
    join public.ai_estimate_sources s on s.id = e.source_id and s.organization_id = e.organization_id
    cross join lateral (select e.client_id where e.client_id is not null union all select null::uuid) scope
    where line.organization_id = p_organization_id and e.visibility = 'organization' and s.visibility = 'organization'
      and s.status = 'approved' and s.document_kind='estimate'
      and (s.valid_from is null or s.valid_from<=(now() at time zone 'Asia/Tokyo')::date)
      and (s.valid_until is null or s.valid_until>=(now() at time zone 'Asia/Tokyo')::date) and line.unit_price > 0 and line.qty > 0 and e.tax_mode <> 'unknown' and line.tax_category <> 'follow_company'
    group by line.organization_id, scope.client_id, line.normalized_name, e.id, line.standard_item_id, e.currency,
      lower(normalize(trim(coalesce(line.normalized_unit, line.unit, '')), NFKC)), e.tax_mode, line.tax_category
  ) select organization_id, client_id, normalized_name, min(display_name), count(*)::integer,
    percentile_cont(0.5) within group(order by price), percentile_cont(0.25) within group(order by price),
    percentile_cont(0.75) within group(order by price), max(issue_date)::timestamptz, standard_item_id, currency, unit,
    tax_mode, tax_category, min(price), max(price)
  from per_document group by organization_id, client_id, normalized_name, standard_item_id, currency, unit, tax_mode, tax_category;
  get diagnostics inserted_count = row_count;
  return inserted_count;
end;
$$;

create function public.ai_estimate_get_price_anchors_v2(p_organization_id uuid,p_example_ids uuid[],p_client_id uuid default null,
  p_source_ids uuid[] default '{}'::uuid[],p_as_of date default (now() at time zone 'Asia/Tokyo')::date)
returns table(display_name text, normalized_name text, sample_count integer, median_price double precision,
  p25_price double precision, p75_price double precision, scope text, unit text, tax_category public.tax_category,
  tax_mode text, currency text, example_ids uuid[], line_ids uuid[], sources jsonb)
language plpgsql stable security invoker set search_path=public as $$
begin
  perform count(*) from public.ai_estimate_eligible_examples_v2(p_organization_id,true,p_source_ids,p_as_of,p_client_id);
  return query
  with eligible as materialized (select * from public.ai_estimate_eligible_examples_v2(p_organization_id,true,p_source_ids,p_as_of,p_client_id)),
  wanted as (
    select distinct l.normalized_name from public.ai_estimate_example_lines l join eligible e on e.id = l.example_id
    where (p_example_ids is null or e.id = any(p_example_ids[1:20])) and l.organization_id = p_organization_id
  ), scoped as (
    select l.*, e.client_id, e.source_id, e.subject, e.issue_date, e.currency, e.tax_mode,
      lower(normalize(trim(coalesce(l.normalized_unit, l.unit, '')), NFKC)) price_unit,
      sc.scope_name
    from public.ai_estimate_example_lines l join eligible e on e.id = l.example_id
    join public.ai_estimate_sources s on s.id = e.source_id and s.organization_id = p_organization_id
    cross join lateral (select 'company'::text scope_name union all select 'client' where p_client_id is not null and e.client_id = p_client_id) sc
    where l.organization_id = p_organization_id and e.visibility = 'organization' and s.visibility = 'organization' and s.document_kind='estimate'
      and l.normalized_name in (select w.normalized_name from wanted w)
      and l.unit_price > 0 and l.qty > 0 and e.tax_mode <> 'unknown' and l.tax_category <> 'follow_company'
  ), per_document as (
    select s.normalized_name, min(s.name) display_name, s.example_id, s.price_unit, s.tax_category, s.tax_mode, s.currency, s.scope_name,
      percentile_cont(0.5) within group(order by s.unit_price) price
    from scoped s group by s.normalized_name, s.example_id, s.price_unit, s.tax_category, s.tax_mode, s.currency, s.scope_name
  ), groups as (
    select d.normalized_name, min(d.display_name) display_name, count(*)::integer sample_count,
      percentile_cont(0.5) within group(order by d.price) median_price,
      percentile_cont(0.25) within group(order by d.price) p25_price,
      percentile_cont(0.75) within group(order by d.price) p75_price,
      d.scope_name, d.price_unit, d.tax_category, d.tax_mode, d.currency,
      (array_agg(d.example_id order by d.example_id))[1:50] example_ids
    from per_document d group by d.normalized_name, d.scope_name, d.price_unit, d.tax_category, d.tax_mode, d.currency
  ) select g.display_name, g.normalized_name, g.sample_count, g.median_price, g.p25_price, g.p75_price,
    g.scope_name, g.price_unit, g.tax_category, g.tax_mode, g.currency, g.example_ids,
    (select array_agg(x.id order by x.id) from (select s.id from scoped s
      where s.example_id = any(g.example_ids) and s.normalized_name = g.normalized_name and s.price_unit = g.price_unit
        and s.tax_category = g.tax_category and s.tax_mode = g.tax_mode and s.currency = g.currency and s.scope_name = g.scope_name
      order by s.id limit 100) x),
    (select jsonb_agg(jsonb_build_object('exampleId', e.id, 'sourceId', e.source_id,
      'label', concat_ws(' · ', e.issue_date::text, e.subject)) order by e.id)
      from eligible e where e.id = any(g.example_ids))
  from groups g order by (g.scope_name = 'client') desc, g.sample_count desc, g.normalized_name, g.price_unit, g.tax_category
  limit 320;
end;
$$;


revoke all on function public.ai_estimate_get_price_anchors_v2(uuid,uuid[],uuid,uuid[],date) from public,anon;
grant execute on function public.ai_estimate_get_price_anchors_v2(uuid,uuid[],uuid,uuid[],date) to authenticated,service_role;

-- Preserve legacy signatures while applying current approval, type and date eligibility.
create or replace function public.ai_estimate_search_approved(p_organization_id uuid,p_query_text text,p_query_embedding text default null,
  p_embedding_model text default null,p_client_id uuid default null,p_allow_private boolean default false,p_limit integer default 20)
returns table(example_id uuid,keyword_score double precision,vector_score double precision,same_client boolean,example jsonb)
language sql stable security invoker set search_path=public as $$
  select * from public.ai_estimate_search_approved_v2(p_organization_id,p_query_text,p_query_embedding,p_embedding_model,p_client_id,p_allow_private,p_limit);
$$;
create or replace function public.ai_estimate_get_price_anchors(p_organization_id uuid,p_example_ids uuid[],p_client_id uuid default null)
returns table(display_name text,normalized_name text,sample_count integer,median_price double precision,p25_price double precision,p75_price double precision,
  scope text,unit text,tax_category public.tax_category,tax_mode text,currency text,example_ids uuid[],line_ids uuid[],sources jsonb)
language sql stable security invoker set search_path=public as $$
  select * from public.ai_estimate_get_price_anchors_v2(p_organization_id,p_example_ids,p_client_id);
$$;


create or replace function public.ai_estimate_finish_extraction(p_job_id uuid,p_attempt integer,p_run_id uuid,p_result jsonb)
returns boolean language plpgsql security definer set search_path=public as $$
declare source public.ai_estimate_sources; job public.ai_estimate_jobs; run_id uuid; succeeded boolean; target text; provider_name text:=coalesce(p_result->>'provider','gemini');
begin
  if provider_name not in ('gemini','anthropic','local') then raise exception '지원되지 않는 추출 제공자입니다.' using errcode='22023'; end if;
  select s.* into source from public.ai_estimate_sources s join public.ai_estimate_jobs j on j.source_id=s.id where j.id=p_job_id for update of s;
  if not found or source.status in ('approved','excluded') then return false; end if;
  select * into job from public.ai_estimate_jobs where id=p_job_id for update;
  if job.attempt<>p_attempt or job.last_run_id is distinct from p_run_id or job.status not in ('extracting','extracted','validating')
    or exists(select 1 from public.ai_estimate_extractions where source_id=source.id and source_of_truth='human') then return false; end if;
  succeeded:=p_result->>'outcome'='succeeded';
  if succeeded then
    if coalesce(p_result->'reviewExtraction'->>'documentKind','estimate')<>source.document_kind then
      raise exception '자료 분류와 검수 내용이 일치하지 않습니다.' using errcode='22023';
    end if;
    perform public.ai_estimate_validate_review(p_result->'reviewExtraction',false);
  end if;
  insert into public.ai_estimate_extraction_runs(organization_id,source_id,batch_run_id,provider,model,prompt_version,extraction_version,attempt,
    raw_output,normalized_output,confidence,outcome,error_code,error_class,input_tokens,output_tokens,estimated_cost_micro_usd,latency_ms)
  values(source.organization_id,source.id,p_run_id,provider_name,p_result->>'model',p_result->>'promptVersion',p_result->>'extractionVersion',p_attempt,
    p_result->'rawOutput',p_result->'normalized',(p_result->>'confidence')::numeric,p_result->>'outcome',p_result->>'errorCode',p_result->>'errorClass',
    (p_result->>'inputTokens')::integer,(p_result->>'outputTokens')::integer,(p_result->>'estimatedCostMicroUsd')::integer,(p_result->>'latencyMs')::integer)
    returning id into run_id;
  if succeeded then
    insert into public.ai_estimate_extractions(organization_id,source_id,extracted_data,raw_text,confidence,provider,model,extraction_run_id,prompt_version,extraction_version,source_of_truth)
      values(source.organization_id,source.id,p_result->'reviewExtraction','',(p_result->>'confidence')::numeric,provider_name,p_result->>'model',run_id,
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


create or replace function public.ai_estimate_prepare_manual_review(p_source_id uuid,p_extraction jsonb)
returns boolean language plpgsql security definer set search_path=public as $$
declare source public.ai_estimate_sources;
begin
  select * into source from public.ai_estimate_sources where id=p_source_id for update;
  if not found or source.status in ('approved','excluded') then return false; end if;
  if exists(select 1 from public.ai_estimate_jobs where source_id=p_source_id and status in ('extracting','extracted','validating')
    and locked_at > now()-interval '15 minutes') then return false; end if;
  if coalesce(p_extraction->>'documentKind','estimate')<>source.document_kind then
    raise exception '자료 분류와 검수 내용이 일치하지 않습니다.' using errcode='22023';
  end if;
  perform public.ai_estimate_validate_review(p_extraction,false);
  insert into public.ai_estimate_extractions(organization_id,source_id,extracted_data,confidence,provider,source_of_truth)
    values(source.organization_id,p_source_id,p_extraction,0,'manual-review','legacy') on conflict(source_id) do nothing;
  update public.ai_estimate_sources set status='review_required',error_message=null where id=p_source_id;
  update public.ai_estimate_jobs set status='needs_review',review_reasons=array['manual_review_required'],
    locked_at=null,locked_by=null,next_retry_at=null,finished_at=now() where source_id=p_source_id;
  return true;
end;
$$;

-- A saved estimate keeps the suggestions applied during every edit. Replacing lines does not erase provenance.
create function public.ai_estimate_guard_suggestion_document()
returns trigger language plpgsql security invoker set search_path=public as $$
begin
  if tg_op='UPDATE' and old.estimate_id is not null then
    if new.estimate_id is null and pg_trigger_depth()>1 and not exists(select 1 from public.estimates where id=old.estimate_id) then
      return new; -- Keep the existing ON DELETE SET NULL relationship usable for actual document deletion.
    end if;
    if new.estimate_id is distinct from old.estimate_id then
      raise exception 'AI_SUGGESTION_UNAVAILABLE' using errcode='42501';
    end if;
  end if;
  if new.estimate_id is not null then
    if (tg_op='UPDATE' and row(new.organization_id,new.requested_by) is distinct from row(old.organization_id,old.requested_by))
      or (current_user='authenticated' and (auth.uid() is null or new.requested_by<>auth.uid()))
      or new.status<>'applied'
      or not exists(select 1 from public.estimates where id=new.estimate_id and organization_id=new.organization_id) then
      raise exception 'AI_SUGGESTION_UNAVAILABLE' using errcode='42501';
    end if;
  end if;
  return new;
end;
$$;
create trigger ai_estimate_suggestion_document before insert or update of estimate_id,organization_id,requested_by,status
  on public.ai_estimate_suggestions for each row execute function public.ai_estimate_guard_suggestion_document();
revoke all on function public.ai_estimate_guard_suggestion_document() from public,anon,authenticated;

create function public.save_estimate_with_ai_evidence(_document jsonb,_lines jsonb,_suggestion_ids uuid[],_id uuid default null)
returns uuid language plpgsql security invoker set search_path=public as $$
declare ids uuid[]:=coalesce(_suggestion_ids,'{}'::uuid[]); saved_id uuid; org_id uuid; matched integer;
begin
  if cardinality(ids)>20 or coalesce(array_ndims(ids),1)>1 then
    raise exception 'AI_SUGGESTION_UNAVAILABLE' using errcode='22023';
  end if;
  if array_position(ids,null) is not null or cardinality(ids)<>(select count(distinct id) from unnest(ids) id) then
    raise exception 'AI_SUGGESTION_UNAVAILABLE' using errcode='22023';
  end if;
  saved_id:=public.save_sales_document('estimate',_document,_lines,_id);
  if cardinality(ids)=0 then return saved_id; end if;
  select organization_id into org_id from public.estimates where id=saved_id;
  -- Lock every requested row in a stable order before validating and linking; failure rolls back the document too.
  perform id from public.ai_estimate_suggestions where id=any(ids) order by id for update;
  select count(*) into matched from public.ai_estimate_suggestions where id=any(ids)
    and organization_id=org_id and requested_by=auth.uid() and status in ('generated','applied')
    and (estimate_id is null or estimate_id=saved_id);
  if matched<>cardinality(ids) then raise exception 'AI_SUGGESTION_UNAVAILABLE' using errcode='42501'; end if;
  update public.ai_estimate_suggestions set estimate_id=saved_id,status='applied',applied_at=coalesce(applied_at,now()) where id=any(ids);
  return saved_id;
end;
$$;
revoke all on function public.save_estimate_with_ai_evidence(jsonb,jsonb,uuid[],uuid) from public,anon;
grant execute on function public.save_estimate_with_ai_evidence(jsonb,jsonb,uuid[],uuid) to authenticated;

notify pgrst,'reload schema';
commit;
