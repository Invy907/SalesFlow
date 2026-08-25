-- 0019_ai_estimate_batch.sql
-- 과거 스캔 견적서 배치 처리(Gemini) 지원.
-- 0016_ai_estimates.sql 을 확장한다. 기존 ai-library UI 와 actions/ai-estimates.ts 는 그대로 동작한다.

create extension if not exists vector with schema extensions;

/* ------------------------------------------------------------------ */
/* 1. 배치 실행 단위                                                   */
/* ------------------------------------------------------------------ */

create table if not exists public.ai_estimate_batch_runs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  command text not null check (command in ('dry-run', 'smoke', 'pilot', 'ingest', 'retry', 'reindex', 'verify')),
  mode text not null default 'dry-run' check (mode in ('dry-run', 'live')),
  requested_limit integer check (requested_limit is null or requested_limit > 0),
  confirmed_all boolean not null default false,
  prompt_version text,
  extraction_version text,
  extraction_model text,
  retry_model text,
  concurrency integer,
  status text not null default 'running' check (status in ('running', 'completed', 'aborted', 'failed')),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  -- 집계값. 문서 내용은 담지 않는다.
  total_candidates integer not null default 0,
  processed_count integer not null default 0,
  needs_review_count integer not null default 0,
  approved_count integer not null default 0,
  failed_count integer not null default 0,
  duplicate_count integer not null default 0,
  input_tokens bigint not null default 0,
  output_tokens bigint not null default 0,
  estimated_cost_micro_usd bigint not null default 0,
  error_summary jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists ai_estimate_batch_runs_org_started_idx
  on public.ai_estimate_batch_runs (organization_id, started_at desc);

/* ------------------------------------------------------------------ */
/* 2. 문서별 처리 작업 (13종 상태의 SSOT)                              */
/* ------------------------------------------------------------------ */

create table if not exists public.ai_estimate_jobs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  source_id uuid not null unique references public.ai_estimate_sources(id) on delete cascade,
  status text not null default 'uploaded' check (status in (
    'uploaded', 'queued', 'extracting', 'extracted', 'validating',
    'needs_review', 'approved', 'indexing', 'indexed',
    'failed_retryable', 'failed_permanent', 'rejected', 'duplicate'
  )),
  -- 중복 판별 결과. duplicate 일 때 원본을 가리킨다.
  duplicate_of_source_id uuid references public.ai_estimate_sources(id) on delete set null,
  attempt integer not null default 0 check (attempt >= 0),
  max_attempt integer not null default 3 check (max_attempt >= 0),
  next_retry_at timestamptz,
  last_run_id uuid references public.ai_estimate_batch_runs(id) on delete set null,
  -- 실패 원인은 코드로만 남긴다. 문서 내용·개인정보를 넣지 않는다.
  last_error_code text,
  last_error_class text check (last_error_class is null or last_error_class in (
    'network', 'rate_limit', 'server', 'auth', 'invalid_json', 'schema',
    'storage', 'db', 'unsupported_file', 'timeout', 'unknown'
  )),
  -- 검수 필요 사유 코드 배열 (예: {'missing_customer','total_mismatch'})
  review_reasons text[] not null default '{}',
  locked_at timestamptz,
  locked_by text,
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists ai_estimate_jobs_pickup_idx
  on public.ai_estimate_jobs (organization_id, status, next_retry_at nulls first, created_at);
create index if not exists ai_estimate_jobs_status_idx
  on public.ai_estimate_jobs (organization_id, status);
create index if not exists ai_estimate_jobs_run_idx
  on public.ai_estimate_jobs (last_run_id);

drop trigger if exists ai_estimate_jobs_updated_at on public.ai_estimate_jobs;
create trigger ai_estimate_jobs_updated_at
  before update on public.ai_estimate_jobs
  for each row execute function public.set_updated_at();

/* ------------------------------------------------------------------ */
/* 3. Gemini 호출 이력 (원본 출력 보존, append-only)                    */
/* ------------------------------------------------------------------ */

create table if not exists public.ai_estimate_extraction_runs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  source_id uuid not null references public.ai_estimate_sources(id) on delete cascade,
  batch_run_id uuid references public.ai_estimate_batch_runs(id) on delete set null,
  provider text not null default 'gemini',
  model text not null,
  prompt_version text not null,
  extraction_version text not null,
  attempt integer not null default 1 check (attempt >= 1),
  -- Gemini 원본 출력. 절대 수정하지 않는다.
  raw_output jsonb,
  -- 자동 정규화 결과. raw_output 을 건드리지 않고 파생시킨 값.
  normalized_output jsonb,
  confidence numeric(5,4),
  outcome text not null check (outcome in ('succeeded', 'invalid_json', 'schema_failed', 'api_failed')),
  error_code text,
  error_class text,
  input_tokens integer,
  output_tokens integer,
  estimated_cost_micro_usd integer,
  latency_ms integer,
  created_at timestamptz not null default now()
);

-- 각 API 호출은 감사 가능한 별도 행이다. 같은 attempt 의 재삽입만 막고,
-- 재시도(attempt 증가)는 기존 raw_output 을 덮어쓰지 않고 새 행으로 쌓는다.
create unique index if not exists ai_estimate_extraction_runs_key_uidx
  on public.ai_estimate_extraction_runs (source_id, prompt_version, model, attempt);
create index if not exists ai_estimate_extraction_runs_source_idx
  on public.ai_estimate_extraction_runs (source_id, created_at desc);
create index if not exists ai_estimate_extraction_runs_batch_idx
  on public.ai_estimate_extraction_runs (batch_run_id);

/* ------------------------------------------------------------------ */
/* 4. 사람 수정 감사 이력                                              */
/* ------------------------------------------------------------------ */

create table if not exists public.ai_estimate_review_edits (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  source_id uuid not null references public.ai_estimate_sources(id) on delete cascade,
  edited_by uuid not null references auth.users(id) on delete restrict,
  field_path text not null,
  before_value jsonb,
  after_value jsonb,
  reason text,
  created_at timestamptz not null default now()
);

create index if not exists ai_estimate_review_edits_source_idx
  on public.ai_estimate_review_edits (source_id, created_at desc);

/* ------------------------------------------------------------------ */
/* 5. 표준 품목 + 별칭 (AI 자동 병합 금지)                              */
/* ------------------------------------------------------------------ */

create table if not exists public.ai_estimate_standard_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  display_name text not null,
  normalized_name text not null,
  category text,
  default_unit text,
  default_tax_category public.tax_category not null default 'standard_10',
  status text not null default 'proposed' check (status in ('proposed', 'approved', 'merged', 'rejected')),
  merged_into_id uuid references public.ai_estimate_standard_items(id) on delete set null,
  approved_by uuid references auth.users(id) on delete set null,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists ai_estimate_standard_items_name_uidx
  on public.ai_estimate_standard_items (organization_id, normalized_name)
  where status <> 'rejected';
create index if not exists ai_estimate_standard_items_status_idx
  on public.ai_estimate_standard_items (organization_id, status, updated_at desc);

drop trigger if exists ai_estimate_standard_items_updated_at on public.ai_estimate_standard_items;
create trigger ai_estimate_standard_items_updated_at
  before update on public.ai_estimate_standard_items
  for each row execute function public.set_updated_at();

create table if not exists public.ai_estimate_item_aliases (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  standard_item_id uuid references public.ai_estimate_standard_items(id) on delete cascade,
  raw_name text not null,
  normalized_name text not null,
  -- 사람이 승인해야 approved. AI 는 candidate 까지만 만든다.
  status text not null default 'candidate' check (status in ('candidate', 'approved', 'rejected')),
  similarity numeric(5,4),
  source_id uuid references public.ai_estimate_sources(id) on delete set null,
  approved_by uuid references auth.users(id) on delete set null,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ai_estimate_item_aliases_approved_needs_item check (
    status <> 'approved' or standard_item_id is not null
  )
);

create unique index if not exists ai_estimate_item_aliases_name_uidx
  on public.ai_estimate_item_aliases (organization_id, normalized_name)
  where status = 'approved';
create index if not exists ai_estimate_item_aliases_lookup_idx
  on public.ai_estimate_item_aliases (organization_id, normalized_name, status);

drop trigger if exists ai_estimate_item_aliases_updated_at on public.ai_estimate_item_aliases;
create trigger ai_estimate_item_aliases_updated_at
  before update on public.ai_estimate_item_aliases
  for each row execute function public.set_updated_at();

/* ------------------------------------------------------------------ */
/* 6. 기존 테이블 확장 (파괴적 변경 없음)                               */
/* ------------------------------------------------------------------ */

alter table public.ai_estimate_extractions
  add column if not exists extraction_run_id uuid references public.ai_estimate_extraction_runs(id) on delete set null,
  add column if not exists prompt_version text,
  add column if not exists extraction_version text,
  add column if not exists source_of_truth text not null default 'legacy'
    check (source_of_truth in ('ai', 'human', 'legacy'));

alter table public.ai_estimate_examples
  add column if not exists tax_mode text not null default 'unknown'
    check (tax_mode in ('included', 'excluded', 'unknown')),
  add column if not exists printed_subtotal numeric(18,2),
  add column if not exists printed_discount numeric(18,2),
  add column if not exists printed_tax numeric(18,2),
  add column if not exists printed_total numeric(18,2),
  add column if not exists computed_subtotal numeric(18,2),
  add column if not exists computed_tax numeric(18,2),
  add column if not exists computed_total numeric(18,2),
  add column if not exists total_delta numeric(18,2),
  add column if not exists estimate_number text,
  add column if not exists valid_until date;

alter table public.ai_estimate_example_lines
  add column if not exists raw_item_name text,
  add column if not exists raw_unit text,
  add column if not exists normalized_unit text,
  add column if not exists specification text,
  add column if not exists standard_item_id uuid references public.ai_estimate_standard_items(id) on delete set null,
  add column if not exists printed_amount numeric(18,2),
  add column if not exists computed_amount numeric(18,2),
  add column if not exists amount_delta numeric(18,2),
  add column if not exists printed_tax_rate_percent numeric(5,2);

create index if not exists ai_estimate_example_lines_standard_item_idx
  on public.ai_estimate_example_lines (organization_id, standard_item_id, created_at desc)
  where standard_item_id is not null;

-- 임베딩: 기존 jsonb 컬럼은 남기고 pgvector 컬럼을 추가한다.
-- gemini-embedding-001 은 3072차원이 기본이지만 pgvector 인덱스 상한(2000)을 넘으므로
-- output_dimensionality=1536 으로 잘라서 저장하고 반드시 재정규화한다.
alter table public.ai_estimate_chunks
  add column if not exists embedding_vector extensions.vector(1536),
  add column if not exists embedding_model text,
  add column if not exists embedding_dim integer;

create index if not exists ai_estimate_chunks_vector_idx
  on public.ai_estimate_chunks using hnsw (embedding_vector extensions.vector_cosine_ops);

alter table public.ai_estimate_price_stats
  add column if not exists standard_item_id uuid references public.ai_estimate_standard_items(id) on delete cascade,
  add column if not exists currency text not null default 'JPY',
  add column if not exists unit text,
  add column if not exists tax_mode text not null default 'excluded'
    check (tax_mode in ('included', 'excluded', 'unknown')),
  add column if not exists min_price numeric(18,2),
  add column if not exists max_price numeric(18,2),
  add column if not exists excluded_outlier_count integer not null default 0;

-- 기존 키는 단위·통화·세금 기준이 다른 가격을 한 행으로 섞는다.
drop index if exists public.ai_estimate_price_stats_scope_uidx;
create unique index ai_estimate_price_stats_scope_uidx
  on public.ai_estimate_price_stats (
    organization_id,
    coalesce(client_id, '00000000-0000-0000-0000-000000000000'::uuid),
    normalized_name,
    coalesce(standard_item_id, '00000000-0000-0000-0000-000000000000'::uuid),
    currency,
    coalesce(unit, ''),
    tax_mode
  );

-- 가이드라인 9항: 파일 해시 중복은 유일 제약으로 막는다.
-- 이미 중복 행이 있으면 이 인덱스 생성이 실패한다. 그때는 중복을 excluded 로
-- 정리한 뒤 다시 적용한다(파괴적 자동 정리를 하지 않는다).
create unique index if not exists ai_estimate_sources_hash_uidx
  on public.ai_estimate_sources (organization_id, file_hash)
  where file_hash is not null and status <> 'excluded';

-- 배치가 스캔한 로컬 경로를 기록해 재실행 시 같은 파일을 다시 올리지 않는다.
alter table public.ai_estimate_sources
  add column if not exists ingest_origin text
    check (ingest_origin is null or ingest_origin in ('ui-upload', 'estimate-import', 'batch-local', 'batch-storage')),
  add column if not exists ingest_ref text,
  add column if not exists page_count integer;

create unique index if not exists ai_estimate_sources_ingest_ref_uidx
  on public.ai_estimate_sources (organization_id, ingest_ref)
  where ingest_ref is not null;

-- UI 업로드와 기존 견적 가져오기도 별도 코드 변경 없이 배치 job 을 갖게 한다.
create or replace function public.ai_estimate_create_job_for_source()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.ai_estimate_jobs (organization_id, source_id, status)
  values (
    new.organization_id,
    new.id,
    case new.status
      when 'processing' then 'queued'
      when 'review_required' then 'needs_review'
      when 'approved' then 'approved'
      when 'failed' then 'failed_retryable'
      when 'excluded' then 'rejected'
      else 'uploaded'
    end
  )
  on conflict (source_id) do nothing;
  return new;
end;
$$;

drop trigger if exists ai_estimate_sources_create_job on public.ai_estimate_sources;
create trigger ai_estimate_sources_create_job
  after insert on public.ai_estimate_sources
  for each row execute function public.ai_estimate_create_job_for_source();

/* ------------------------------------------------------------------ */
/* 7. RLS                                                             */
/* ------------------------------------------------------------------ */

alter table public.ai_estimate_batch_runs enable row level security;
alter table public.ai_estimate_jobs enable row level security;
alter table public.ai_estimate_extraction_runs enable row level security;
alter table public.ai_estimate_review_edits enable row level security;
alter table public.ai_estimate_standard_items enable row level security;
alter table public.ai_estimate_item_aliases enable row level security;

-- 배치는 service_role 로만 쓴다. authenticated 는 읽기(관리자) + 검수 편집만.
do $$ begin
  create policy ai_estimate_batch_runs_select on public.ai_estimate_batch_runs
    for select to authenticated using (
      organization_id in (select public.auth_org_ids()) and public.auth_has_role_in_org(organization_id, array['owner','admin']::public.member_role[])
    );
exception when duplicate_object then null; end $$;

do $$ begin
  create policy ai_estimate_jobs_select on public.ai_estimate_jobs
    for select to authenticated using (
      organization_id in (select public.auth_org_ids())
      and exists (
        select 1 from public.ai_estimate_sources source
        where source.id = ai_estimate_jobs.source_id
          and (
            source.uploaded_by = (select auth.uid())
            or public.auth_has_role_in_org(source.organization_id, array['owner','admin']::public.member_role[])
          )
      )
    );
exception when duplicate_object then null; end $$;

do $$ begin
  create policy ai_estimate_extraction_runs_select on public.ai_estimate_extraction_runs
    for select to authenticated using (
      organization_id in (select public.auth_org_ids()) and public.auth_has_role_in_org(organization_id, array['owner','admin']::public.member_role[])
    );
exception when duplicate_object then null; end $$;

do $$ begin
  create policy ai_estimate_review_edits_select on public.ai_estimate_review_edits
    for select to authenticated using (
      organization_id in (select public.auth_org_ids())
      and (
        edited_by = (select auth.uid())
        or public.auth_has_role_in_org(organization_id, array['owner','admin']::public.member_role[])
      )
    );
exception when duplicate_object then null; end $$;

do $$ begin
  create policy ai_estimate_review_edits_insert on public.ai_estimate_review_edits
    for insert to authenticated with check (
      organization_id in (select public.auth_org_ids())
      and edited_by = (select auth.uid())
    );
exception when duplicate_object then null; end $$;

do $$ begin
  create policy ai_estimate_standard_items_select on public.ai_estimate_standard_items
    for select to authenticated using (
      organization_id in (select public.auth_org_ids())
    );
exception when duplicate_object then null; end $$;

do $$ begin
  create policy ai_estimate_standard_items_admin_write on public.ai_estimate_standard_items
    for all to authenticated
    using (organization_id in (select public.auth_org_ids()) and public.auth_has_role_in_org(organization_id, array['owner','admin']::public.member_role[]))
    with check (organization_id in (select public.auth_org_ids()) and public.auth_has_role_in_org(organization_id, array['owner','admin']::public.member_role[]));
exception when duplicate_object then null; end $$;

do $$ begin
  create policy ai_estimate_item_aliases_select on public.ai_estimate_item_aliases
    for select to authenticated using (
      organization_id in (select public.auth_org_ids())
    );
exception when duplicate_object then null; end $$;

do $$ begin
  create policy ai_estimate_item_aliases_admin_write on public.ai_estimate_item_aliases
    for all to authenticated
    using (organization_id in (select public.auth_org_ids()) and public.auth_has_role_in_org(organization_id, array['owner','admin']::public.member_role[]))
    with check (organization_id in (select public.auth_org_ids()) and public.auth_has_role_in_org(organization_id, array['owner','admin']::public.member_role[]));
exception when duplicate_object then null; end $$;

/* ------------------------------------------------------------------ */
/* 8. Grants                                                          */
/* ------------------------------------------------------------------ */

grant select on public.ai_estimate_batch_runs to authenticated;
grant select on public.ai_estimate_jobs to authenticated;
grant select on public.ai_estimate_extraction_runs to authenticated;
grant select, insert on public.ai_estimate_review_edits to authenticated;
grant select, insert, update, delete on public.ai_estimate_standard_items to authenticated;
grant select, insert, update, delete on public.ai_estimate_item_aliases to authenticated;

grant all on
  public.ai_estimate_batch_runs,
  public.ai_estimate_jobs,
  public.ai_estimate_extraction_runs,
  public.ai_estimate_review_edits,
  public.ai_estimate_standard_items,
  public.ai_estimate_item_aliases
  to service_role;

/* ------------------------------------------------------------------ */
/* 9. 기존 sources 에 대한 job 백필                                    */
/* ------------------------------------------------------------------ */

insert into public.ai_estimate_jobs (organization_id, source_id, status)
select
  source.organization_id,
  source.id,
  case source.status
    when 'uploaded' then 'uploaded'
    when 'processing' then 'queued'
    when 'review_required' then 'needs_review'
    when 'approved' then 'approved'
    when 'failed' then 'failed_retryable'
    when 'excluded' then 'rejected'
    else 'uploaded'
  end
from public.ai_estimate_sources source
on conflict (source_id) do nothing;

/* ------------------------------------------------------------------ */
/* 10. 벡터 검색 RPC                                                   */
/*                                                                    */
/* pgvector 를 extensions 스키마에 설치하면 <=> 연산자가 기본 search_path */
/* 밖에 있어서 일반 쿼리에서 "operator does not exist" 가 난다.          */
/* 그래서 검색은 search_path 를 고정한 RPC 를 통해서만 한다.             */
/* 인자를 text 로 받는 이유는 supabase-js 가 vector 리터럴을 그대로       */
/* 문자열로 보내기 때문이다.                                            */
/* ------------------------------------------------------------------ */

create or replace function public.ai_estimate_search_chunks(
  p_organization_id uuid,
  p_query text,
  p_limit integer default 10
)
returns table (
  example_id uuid,
  chunk_index integer,
  content text,
  distance double precision
)
language sql
stable
security invoker
set search_path = public, extensions
as $$
  select
    chunk.example_id,
    chunk.chunk_index,
    chunk.content,
    (chunk.embedding_vector <=> p_query::extensions.vector)::double precision as distance
  from public.ai_estimate_chunks chunk
  where chunk.organization_id = p_organization_id
    and chunk.embedding_vector is not null
    and extensions.vector_dims(chunk.embedding_vector) = extensions.vector_dims(p_query::extensions.vector)
  order by chunk.embedding_vector <=> p_query::extensions.vector
  limit greatest(1, least(coalesce(p_limit, 10), 50));
$$;

revoke all on function public.ai_estimate_search_chunks(uuid, text, integer) from public;
grant execute on function public.ai_estimate_search_chunks(uuid, text, integer) to authenticated, service_role;

/* ------------------------------------------------------------------ */
/* 11. 배치 동시 실행 안전장치                                        */
/* ------------------------------------------------------------------ */

create or replace function public.ai_estimate_claim_jobs(
  p_organization_id uuid,
  p_run_id uuid,
  p_worker text,
  p_limit integer default 1
)
returns setof public.ai_estimate_jobs
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  with candidates as (
    select job.id
    from public.ai_estimate_jobs job
    where job.organization_id = p_organization_id
      and job.status = 'queued'
      and (job.next_retry_at is null or job.next_retry_at <= now())
    order by job.created_at
    for update skip locked
    limit greatest(1, least(coalesce(p_limit, 1), 16))
  )
  update public.ai_estimate_jobs job
  set status = 'extracting',
      attempt = job.attempt + 1,
      last_run_id = p_run_id,
      locked_at = now(),
      locked_by = left(p_worker, 200),
      started_at = coalesce(job.started_at, now()),
      updated_at = now()
  from candidates
  where job.id = candidates.id
  returning job.*;
end;
$$;

revoke all on function public.ai_estimate_claim_jobs(uuid, uuid, text, integer) from public, authenticated;
grant execute on function public.ai_estimate_claim_jobs(uuid, uuid, text, integer) to service_role;

/* ------------------------------------------------------------------ */
/* 12. 승인된 가격 통계 재생성                                        */
/* ------------------------------------------------------------------ */

create or replace function public.ai_estimate_rebuild_price_stats(
  p_organization_id uuid
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  inserted_count integer;
begin
  delete from public.ai_estimate_price_stats
  where organization_id = p_organization_id;

  insert into public.ai_estimate_price_stats (
    organization_id, client_id, normalized_name, display_name,
    sample_count, median_price, p25_price, p75_price, last_used_at,
    standard_item_id, currency, unit, tax_mode, min_price, max_price
  )
  select
    line.organization_id,
    scope.client_id,
    line.normalized_name,
    min(line.name),
    count(*)::integer,
    percentile_cont(0.5) within group (order by line.unit_price),
    percentile_cont(0.25) within group (order by line.unit_price),
    percentile_cont(0.75) within group (order by line.unit_price),
    max(example.issue_date)::timestamptz,
    line.standard_item_id,
    example.currency,
    line.normalized_unit,
    example.tax_mode,
    min(line.unit_price),
    max(line.unit_price)
  from public.ai_estimate_example_lines line
  join public.ai_estimate_examples example on example.id = line.example_id
  cross join lateral (values (example.client_id), (null::uuid)) as scope(client_id)
  where line.organization_id = p_organization_id
    and example.organization_id = p_organization_id
    and example.visibility = 'organization'
    and line.unit_price > 0
  group by
    line.organization_id, scope.client_id, line.normalized_name,
    line.standard_item_id, example.currency, line.normalized_unit, example.tax_mode;

  get diagnostics inserted_count = row_count;
  return inserted_count;
end;
$$;

revoke all on function public.ai_estimate_rebuild_price_stats(uuid) from public, authenticated;
grant execute on function public.ai_estimate_rebuild_price_stats(uuid) to service_role;
