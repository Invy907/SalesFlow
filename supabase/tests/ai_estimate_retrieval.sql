-- Synthetic fixtures only; this test always rolls back.
begin;
insert into auth.users(id, instance_id, aud, role, email, raw_user_meta_data) values
 ('00000000-0000-4000-8000-000000003401','00000000-0000-0000-0000-000000000000','authenticated','authenticated','rag-owner@example.invalid','{}'),
 ('00000000-0000-4000-8000-000000003402','00000000-0000-0000-0000-000000000000','authenticated','authenticated','rag-member@example.invalid','{}'),
 ('00000000-0000-4000-8000-000000003403','00000000-0000-0000-0000-000000000000','authenticated','authenticated','rag-other@example.invalid','{}');
insert into public.organization_members(organization_id,user_id,role)
select organization_id,'00000000-0000-4000-8000-000000003402','member' from public.organization_members where user_id='00000000-0000-4000-8000-000000003401';
create temporary table rag_context as select organization_id org from public.organization_members where user_id='00000000-0000-4000-8000-000000003401';
grant select on rag_context to authenticated;
insert into public.ai_estimate_settings(organization_id,enabled,allow_private_sources) select org,true,true from rag_context
on conflict(organization_id) do update set enabled=true,allow_private_sources=true;
insert into public.ai_estimate_sources(id,organization_id,source_type,title,storage_path,mime_type,status,visibility,uploaded_by)
select md5('rag-source-'||n)::uuid,
 case when n=6 then (select organization_id from public.organization_members where user_id='00000000-0000-4000-8000-000000003403') else (select org from rag_context) end,
 'upload','Synthetic evidence '||n,'qa/'||n||'.pdf','application/pdf',case when n=2 then 'excluded' when n=5 then 'review_required' else 'approved' end,
 case when n in (3,4,9) then 'private' else 'organization' end,
 case when n in (3,9,10) then '00000000-0000-4000-8000-000000003402'::uuid else '00000000-0000-4000-8000-000000003401'::uuid end
from generate_series(1,620) n;
insert into public.ai_estimate_examples(id,organization_id,source_id,visibility,owner_user_id,subject,issue_date,currency,tax_mode,search_text,approved_by)
select md5('rag-example-'||n)::uuid,s.organization_id,s.id,
 case when n in (3,4,10) then 'private' else 'organization' end,s.uploaded_by,s.title,
 case when n=1 then '2000-01-01'::date else '2026-09-23'::date end,
 case when n=15 then 'KRW' else 'JPY' end,case when n=14 then 'included' when n=19 then 'unknown' else 'excluded' end,
 case when n in (1,2,5,6) then 'ホームページ制作 デザイン' when n in (3,4,9,10) then '비밀전용 디자인'
 when n in (7,8,14,15,16,17,18,19) then '홈페이지 리뉴얼 웹 디자인' when n in (11,12,13) then '保守点検' else '자동차 정비' end,
 s.uploaded_by
from generate_series(1,620) n join public.ai_estimate_sources s on s.id=md5('rag-source-'||n)::uuid;
insert into public.ai_estimate_example_lines(id,organization_id,example_id,line_no,name,normalized_name,qty,unit,unit_price,tax_category)
select md5('rag-line-'||n)::uuid,e.organization_id,e.id,1,'웹 디자인','웹 디자인',1,
 case when n=16 then '시간' else '식' end,
 case when n=1 then 100 when n=7 then 200 when n=8 then 300 when n=18 then 0 else 999999 end,
 case when n=17 then 'reduced_8'::public.tax_category else 'standard_10'::public.tax_category end
from generate_series(1,19) n join public.ai_estimate_examples e on e.id=md5('rag-example-'||n)::uuid;
-- A duplicated line in one document must not inflate statistical sample count.
insert into public.ai_estimate_example_lines(organization_id,example_id,line_no,name,normalized_name,qty,unit,unit_price,tax_category)
select organization_id,id,2,'웹 디자인','웹 디자인',1,'식',100,'standard_10' from public.ai_estimate_examples where id=md5('rag-example-1')::uuid;
-- Keep unrelated vector fixtures out of price statistics.
delete from public.ai_estimate_example_lines where example_id in (md5('rag-example-11')::uuid,md5('rag-example-12')::uuid,md5('rag-example-13')::uuid);
insert into public.ai_estimate_chunks(organization_id,example_id,chunk_index,content,embedding_vector,embedding_model,embedding_dim)
select e.organization_id,e.id,0,'synthetic vector',
 ('['||(case when n=12 then '0,1,' else '1,0,' end)||array_to_string(array_fill(0,array[1534]),',')||']')::extensions.vector,
 case when n=13 then 'wrong-model' else 'gemini-embedding-001' end,1536
from generate_series(1,13) n join public.ai_estimate_examples e on e.id=md5('rag-example-'||n)::uuid where n in (1,2,3,4,6,11,12,13);
-- Excluded, foreign, private and unknown-tax rows must never poison shared stats.
select public.ai_estimate_rebuild_price_stats(org) from rag_context;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000003401',true);
set local role authenticated;
do $$ declare org_id uuid; ids uuid[]; embedding text; anchors record; begin
 select org into org_id from rag_context;
 assert public.ai_estimate_search_terms('ＷＥＢ DESIGN') = array['design','web'], 'NFKC and casefold';
 assert cardinality(public.ai_estimate_search_terms('ホームページ制作')) > 1, 'Japanese bigrams';
 select array_agg(example_id) into ids from public.ai_estimate_search_approved(org_id,'ホームページ制作の見積もり');
 assert ids = array[md5('rag-example-1')::uuid], 'older than 500 documents survives; excluded/unapproved/foreign are omitted';
 select array_agg(example_id) into ids from public.ai_estimate_search_approved(org_id,'홈페이지를 리뉴얼');
 assert md5('rag-example-7')::uuid = any(ids), 'Korean query with suffix matches';
 assert not exists(select 1 from public.ai_estimate_search_approved(org_id,'비밀전용',null,null,null,false)), 'private opt-out';
 select array_agg(example_id) into ids from public.ai_estimate_search_approved(org_id,'비밀전용',null,null,null,true);
 assert ids = array[md5('rag-example-4')::uuid], 'even admin only searches own private evidence';
 assert not exists(select 1 from public.ai_estimate_search_approved(org_id,'무관질문')), 'irrelevant corpus does not produce evidence';
 embedding := '[1,'||array_to_string(array_fill(0,array[1535]),',')||']';
 select array_agg(example_id) into ids from public.ai_estimate_search_approved(org_id,'무관질문',embedding,'gemini-embedding-001',null,false);
 assert md5('rag-example-11')::uuid = any(ids), 'semantic-only match is usable';
 assert not (md5('rag-example-12')::uuid = any(ids)), 'orthogonal vector rejected';
 assert not (md5('rag-example-13')::uuid = any(ids)), 'embedding model mismatch rejected';
 assert not (md5('rag-example-2')::uuid = any(ids)), 'excluded vector rejected';
 assert not (md5('rag-example-3')::uuid = any(ids)), 'private vector rejected before ranking';
 assert not (md5('rag-example-6')::uuid = any(ids)), 'cross-org vector rejected';
 assert not exists(select 1 from public.ai_estimate_search_chunks(org_id,embedding) where example_id in(md5('rag-example-2')::uuid,md5('rag-example-3')::uuid)), 'legacy RPC also closes eligibility hole';
 select * into strict anchors from public.ai_estimate_get_price_anchors(org_id,array[md5('rag-example-1')::uuid])
 where scope='company' and unit='식' and tax_category='standard_10' and tax_mode='excluded' and currency='JPY';
 assert anchors.sample_count = 3, 'distinct documents, no double NULL client scope and no repeated rows';
 assert anchors.median_price = 200, 'median unaffected by excluded/private/zero/foreign/incompatible evidence';
 assert cardinality(anchors.example_ids)=3 and cardinality(anchors.line_ids)=4, 'exact source and line provenance';
 assert jsonb_array_length(anchors.sources)=3, 'source links retained';
 assert exists(select 1 from public.ai_estimate_price_stats where organization_id=org_id and sample_count=3 and median_price=200 and tax_mode='excluded' and currency='JPY' and unit='식' and tax_category='standard_10'), 'rebuilt materialized stats match dynamic aggregates';
 assert exists(select 1 from public.ai_estimate_get_price_anchors(org_id,null)), 'all-approved recommendations supported';
 assert not exists(select 1 from public.ai_estimate_get_price_anchors(org_id,'{}')), 'empty generation evidence must not pull arbitrary statistics';
 raise notice 'AI retrieval language, old corpus, vector relevance, scope and price regression checks passed';
end $$;
reset role;
update public.ai_estimate_settings set allow_private_sources=false where organization_id=(select org from rag_context);
set local role authenticated;
do $$ begin
 assert not exists(select 1 from public.ai_estimate_search_approved((select org from rag_context),'비밀전용',null,null,null,true)), 'caller cannot override organization private setting';
end $$;
reset role;
update public.ai_estimate_sources set status='excluded' where id=md5('rag-source-1')::uuid;
set local role authenticated;
do $$ declare a record; begin
 assert not exists(select 1 from public.ai_estimate_search_approved((select org from rag_context),'ホームページ制作')), 'excluded source disappears immediately';
 select * into strict a from public.ai_estimate_get_price_anchors((select org from rag_context),array[md5('rag-example-7')::uuid]) where scope='company' and unit='식' and tax_category='standard_10' and tax_mode='excluded' and currency='JPY';
 assert a.sample_count=2 and a.median_price=250, 'read-time statistics cannot reuse stale excluded sample';
end $$;
reset role;
update public.ai_estimate_settings set enabled=false where organization_id=(select org from rag_context);
set local role authenticated;
do $$ begin
 assert not exists(select 1 from public.ai_estimate_search_approved((select org from rag_context),'홈페이지')), 'disabled feature hides retrieval';
 assert not exists(select 1 from public.ai_estimate_get_price_anchors((select org from rag_context),null)), 'disabled feature hides prices';
end $$;
rollback;
