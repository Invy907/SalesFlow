-- Search and prices must refer to currently approved evidence in the caller's scope.
create or replace function public.ai_estimate_search_terms(p_text text)
returns text[] language sql immutable parallel safe set search_path = public as $$
  with words as (
    select word from regexp_split_to_table(lower(normalize(coalesce(p_text, ''), NFKC)), '[^[:alnum:]]+') word
    where char_length(word) > 1
  ), terms as (
    select case when word ~ '[ぁ-ヿ㐀-鿿가-힯]' then substr(word, n, 2) else word end term
    from words cross join lateral generate_series(1, case when word ~ '[ぁ-ヿ㐀-鿿가-힯]' then char_length(word) - 1 else 1 end) n
  ) select coalesce(array_agg(distinct term order by term), '{}'::text[]) from terms;
$$;

alter table public.ai_estimate_examples add column if not exists retrieval_terms text[]
  generated always as (public.ai_estimate_search_terms(search_text)) stored;
create index if not exists ai_estimate_examples_retrieval_terms_idx on public.ai_estimate_examples using gin(retrieval_terms);

create or replace function public.ai_estimate_eligible_examples(p_organization_id uuid, p_allow_private boolean default false)
returns setof public.ai_estimate_examples language sql stable security invoker set search_path = public as $$
  select example.* from public.ai_estimate_examples example
  join public.ai_estimate_sources source on source.id = example.source_id and source.organization_id = example.organization_id
  left join public.ai_estimate_settings settings on settings.organization_id = example.organization_id
  where example.organization_id = p_organization_id and p_organization_id in (select public.auth_org_ids())
    and auth.uid() is not null and source.status = 'approved' and coalesce(settings.enabled, true)
    and ((example.visibility = 'organization' and source.visibility = 'organization')
      or (p_allow_private and coalesce(settings.allow_private_sources, false)
        and example.owner_user_id = auth.uid() and source.uploaded_by = auth.uid()));
$$;
revoke all on function public.ai_estimate_eligible_examples(uuid, boolean) from public, anon;
grant execute on function public.ai_estimate_eligible_examples(uuid, boolean) to authenticated, service_role;

create or replace function public.ai_estimate_search_approved(
  p_organization_id uuid, p_query_text text, p_query_embedding text default null,
  p_embedding_model text default null, p_client_id uuid default null,
  p_allow_private boolean default false, p_limit integer default 20
) returns table(example_id uuid, keyword_score double precision, vector_score double precision, same_client boolean, example jsonb)
language sql stable security invoker set search_path = public, extensions as $$
  with query as (select public.ai_estimate_search_terms(left(p_query_text, 8000)) terms),
  -- Materialize the permission-filtered corpus once: repeated RLS expansion is expensive,
  -- and unrelated tenants/private rows must not affect semantic scoring.
  eligible as materialized (select * from public.ai_estimate_eligible_examples(p_organization_id, p_allow_private)),
  lexical as (
    select e.id, (select count(*)::double precision from unnest(q.terms) term where term = any(e.retrieval_terms))
      / greatest(cardinality(q.terms), 1) score
    from eligible e cross join query q where e.retrieval_terms && q.terms
  ), vectors as (
    select c.example_id id, greatest(0, 1 - min(c.embedding_vector <=> p_query_embedding::extensions.vector))::double precision score
    from public.ai_estimate_chunks c join eligible e on e.id = c.example_id
    where c.organization_id = p_organization_id and p_query_embedding is not null
      and c.embedding_vector is not null and c.embedding_model = p_embedding_model
      and c.embedding_dim = 1536 and extensions.vector_dims(p_query_embedding::extensions.vector) = 1536
    group by c.example_id
  ), scored as (
    select e.*, coalesce(l.score, 0) lexical_score, coalesce(v.score, 0) semantic_score,
      coalesce(e.client_id = p_client_id, false) same_customer
    from eligible e left join lexical l on l.id = e.id left join vectors v on v.id = e.id
    where coalesce(l.score, 0) >= 0.25 or coalesce(v.score, 0) >= 0.65
  ), weighted as (
    select s.*, bool_or(semantic_score >= 0.65) over () vector_used from scored s
  ), ranked as (
    select * from weighted order by
      (case when vector_used then lexical_score * 0.4 + semantic_score * 0.6 else lexical_score end)
      * (case when same_customer then 1.05 else 1 end) desc, id
    limit greatest(1, least(coalesce(p_limit, 20), 100))
  )
  select r.id, r.lexical_score, r.semantic_score, r.same_customer,
    jsonb_build_object('id', r.id, 'source_id', r.source_id, 'owner_user_id', r.owner_user_id,
      'currency', r.currency, 'tax_mode', r.tax_mode, 'client_id', r.client_id, 'client_name', r.client_name,
      'subject', r.subject, 'issue_date', r.issue_date, 'template_message', r.template_message,
      'remarks', r.remarks, 'search_text', r.search_text, 'visibility', r.visibility,
      'ai_estimate_example_lines', coalesce((select jsonb_agg(jsonb_build_object(
        'id', line.id, 'name', line.name, 'qty', line.qty, 'unit', coalesce(line.normalized_unit, line.unit),
        'unit_price', line.unit_price, 'tax_category', line.tax_category) order by line.line_no)
        from public.ai_estimate_example_lines line where line.example_id = r.id and line.organization_id = p_organization_id), '[]'::jsonb))
  from ranked r;
$$;
revoke all on function public.ai_estimate_search_approved(uuid,text,text,text,uuid,boolean,integer) from public, anon;
grant execute on function public.ai_estimate_search_approved(uuid,text,text,text,uuid,boolean,integer) to authenticated, service_role;

-- Close the same eligibility gap in the legacy RPC too. Model-specific new callers use the RPC above.
create or replace function public.ai_estimate_search_chunks(p_organization_id uuid, p_query text, p_limit integer default 10)
returns table(example_id uuid, chunk_index integer, content text, distance double precision)
language sql stable security invoker set search_path = public, extensions as $$
  select chunk.example_id, chunk.chunk_index, chunk.content, (chunk.embedding_vector <=> p_query::extensions.vector)::double precision
  from public.ai_estimate_chunks chunk join public.ai_estimate_eligible_examples(p_organization_id, false) e on e.id = chunk.example_id
  where chunk.organization_id = p_organization_id and chunk.embedding_vector is not null
    and chunk.embedding_model = 'gemini-embedding-001' and chunk.embedding_dim = 1536
    and extensions.vector_dims(p_query::extensions.vector) = 1536
    and (chunk.embedding_vector <=> p_query::extensions.vector) <= 0.35
  order by chunk.embedding_vector <=> p_query::extensions.vector, chunk.id
  limit greatest(1, least(coalesce(p_limit, 10), 50));
$$;
revoke all on function public.ai_estimate_search_chunks(uuid,text,integer) from public, anon;

alter table public.ai_estimate_price_stats add column if not exists tax_category public.tax_category not null default 'standard_10';
drop index if exists public.ai_estimate_price_stats_scope_uidx;
create unique index ai_estimate_price_stats_scope_uidx on public.ai_estimate_price_stats (
  organization_id, coalesce(client_id, '00000000-0000-0000-0000-000000000000'::uuid), normalized_name,
  coalesce(standard_item_id, '00000000-0000-0000-0000-000000000000'::uuid), currency, coalesce(unit, ''), tax_mode, tax_category
);

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
      and s.status = 'approved' and line.unit_price > 0 and line.qty > 0 and e.tax_mode <> 'unknown' and line.tax_category <> 'follow_company'
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
revoke all on function public.ai_estimate_rebuild_price_stats(uuid) from public, anon, authenticated;
grant execute on function public.ai_estimate_rebuild_price_stats(uuid) to service_role;

-- Read-time aggregation avoids stale/excluded prices even if maintenance was interrupted.
create or replace function public.ai_estimate_get_price_anchors(p_organization_id uuid, p_example_ids uuid[], p_client_id uuid default null)
returns table(display_name text, normalized_name text, sample_count integer, median_price double precision,
  p25_price double precision, p75_price double precision, scope text, unit text, tax_category public.tax_category,
  tax_mode text, currency text, example_ids uuid[], line_ids uuid[], sources jsonb)
language sql stable security invoker set search_path = public as $$
  with eligible as materialized (select * from public.ai_estimate_eligible_examples(p_organization_id, true)),
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
    where l.organization_id = p_organization_id and e.visibility = 'organization' and s.visibility = 'organization'
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
$$;
revoke all on function public.ai_estimate_get_price_anchors(uuid,uuid[],uuid) from public, anon;
grant execute on function public.ai_estimate_get_price_anchors(uuid,uuid[],uuid) to authenticated, service_role;

-- Existing aggregates may contain duplicate samples or excluded sources.
do $$ declare org_id uuid; begin
  for org_id in select distinct organization_id from public.ai_estimate_price_stats loop
    perform public.ai_estimate_rebuild_price_stats(org_id);
  end loop;
end $$;
