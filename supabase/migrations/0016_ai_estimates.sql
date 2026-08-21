-- 0016_ai_estimates.sql
-- Organization-scoped AI estimate source library and recommendation data.

create table public.ai_estimate_sources (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  source_type text not null check (source_type in ('upload', 'estimate')),
  title text not null,
  original_file_name text,
  storage_path text,
  mime_type text,
  file_size bigint,
  file_hash text,
  imported_estimate_id uuid references public.estimates(id) on delete set null,
  visibility text not null default 'organization' check (visibility in ('private', 'organization')),
  status text not null default 'uploaded'
    check (status in ('uploaded', 'processing', 'review_required', 'approved', 'failed', 'excluded')),
  error_message text,
  uploaded_by uuid not null references auth.users(id) on delete restrict,
  approved_by uuid references auth.users(id) on delete set null,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ai_estimate_source_file_required check (
    (source_type = 'upload' and storage_path is not null and mime_type is not null)
    or (source_type = 'estimate' and imported_estimate_id is not null)
  )
);

create unique index ai_estimate_sources_imported_estimate_uidx
  on public.ai_estimate_sources (organization_id, imported_estimate_id)
  where imported_estimate_id is not null and status <> 'excluded';
create index ai_estimate_sources_org_status_idx
  on public.ai_estimate_sources (organization_id, status, created_at desc);
create index ai_estimate_sources_file_hash_idx
  on public.ai_estimate_sources (organization_id, file_hash)
  where file_hash is not null and status <> 'excluded';

create trigger ai_estimate_sources_updated_at
  before update on public.ai_estimate_sources
  for each row execute function public.set_updated_at();

create table public.ai_estimate_extractions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  source_id uuid not null unique references public.ai_estimate_sources(id) on delete cascade,
  raw_text text,
  extracted_data jsonb not null default '{}'::jsonb,
  confidence numeric(5,4),
  provider text,
  model text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger ai_estimate_extractions_updated_at
  before update on public.ai_estimate_extractions
  for each row execute function public.set_updated_at();

create table public.ai_estimate_examples (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  source_id uuid not null unique references public.ai_estimate_sources(id) on delete cascade,
  client_id uuid references public.clients(id) on delete set null,
  client_name text,
  visibility text not null default 'organization' check (visibility in ('private', 'organization')),
  owner_user_id uuid not null references auth.users(id) on delete restrict,
  subject text,
  issue_date date,
  currency text not null default 'JPY',
  template_message text,
  remarks text,
  search_text text not null default '',
  approved_by uuid not null references auth.users(id) on delete restrict,
  approved_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index ai_estimate_examples_org_date_idx
  on public.ai_estimate_examples (organization_id, issue_date desc nulls last);
create index ai_estimate_examples_search_idx
  on public.ai_estimate_examples using gin (to_tsvector('simple', search_text));

create trigger ai_estimate_examples_updated_at
  before update on public.ai_estimate_examples
  for each row execute function public.set_updated_at();

create table public.ai_estimate_example_lines (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  example_id uuid not null references public.ai_estimate_examples(id) on delete cascade,
  line_no integer not null check (line_no > 0),
  name text not null,
  normalized_name text not null,
  qty numeric(18,4) not null default 1 check (qty >= 0),
  unit text,
  unit_price numeric(18,2) not null default 0 check (unit_price >= 0),
  tax_category public.tax_category not null default 'standard_10',
  confidence numeric(5,4),
  created_at timestamptz not null default now(),
  unique (example_id, line_no)
);

create index ai_estimate_example_lines_lookup_idx
  on public.ai_estimate_example_lines (organization_id, normalized_name, created_at desc);

create table public.ai_estimate_chunks (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  example_id uuid not null references public.ai_estimate_examples(id) on delete cascade,
  chunk_index integer not null default 0,
  content text not null,
  embedding jsonb,
  created_at timestamptz not null default now(),
  unique (example_id, chunk_index)
);

create index ai_estimate_chunks_search_idx
  on public.ai_estimate_chunks using gin (to_tsvector('simple', content));

create table public.ai_estimate_price_stats (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  client_id uuid references public.clients(id) on delete cascade,
  normalized_name text not null,
  display_name text not null,
  sample_count integer not null default 0,
  median_price numeric(18,2) not null default 0,
  p25_price numeric(18,2) not null default 0,
  p75_price numeric(18,2) not null default 0,
  last_used_at timestamptz,
  updated_at timestamptz not null default now()
);

create unique index ai_estimate_price_stats_scope_uidx
  on public.ai_estimate_price_stats (organization_id, coalesce(client_id, '00000000-0000-0000-0000-000000000000'::uuid), normalized_name);
create index ai_estimate_price_stats_org_client_idx
  on public.ai_estimate_price_stats (organization_id, client_id, last_used_at desc nulls last);

create table public.ai_estimate_suggestions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  requested_by uuid not null references auth.users(id) on delete restrict,
  estimate_id uuid references public.estimates(id) on delete set null,
  prompt_text text,
  request_context jsonb not null default '{}'::jsonb,
  suggestion_data jsonb not null default '{}'::jsonb,
  evidence_example_ids uuid[] not null default '{}',
  provider text,
  model text,
  status text not null default 'generated' check (status in ('generated', 'applied', 'dismissed', 'failed')),
  applied_at timestamptz,
  created_at timestamptz not null default now()
);

create index ai_estimate_suggestions_org_created_idx
  on public.ai_estimate_suggestions (organization_id, created_at desc);

create table public.ai_estimate_settings (
  organization_id uuid primary key references public.organizations(id) on delete cascade,
  enabled boolean not null default true,
  allow_private_sources boolean not null default false,
  minimum_price_samples integer not null default 3 check (minimum_price_samples between 1 and 20),
  auto_import_issued_estimates boolean not null default false,
  source_retention_days integer check (source_retention_days is null or source_retention_days >= 30),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger ai_estimate_settings_updated_at
  before update on public.ai_estimate_settings
  for each row execute function public.set_updated_at();

alter table public.ai_estimate_sources enable row level security;
alter table public.ai_estimate_extractions enable row level security;
alter table public.ai_estimate_examples enable row level security;
alter table public.ai_estimate_example_lines enable row level security;
alter table public.ai_estimate_chunks enable row level security;
alter table public.ai_estimate_price_stats enable row level security;
alter table public.ai_estimate_suggestions enable row level security;
alter table public.ai_estimate_settings enable row level security;

create policy ai_estimate_sources_select on public.ai_estimate_sources for select to authenticated
  using (
    organization_id in (select public.auth_org_ids())
    and (
      visibility = 'organization'
      or uploaded_by = (select auth.uid())
      or public.auth_has_role_in_org(organization_id, array['owner','admin']::public.member_role[])
    )
  );
create policy ai_estimate_sources_insert on public.ai_estimate_sources for insert to authenticated
  with check (
    organization_id in (select public.auth_org_ids())
    and uploaded_by = (select auth.uid())
    and (
      (source_type = 'upload' and status = 'uploaded')
      or (
        source_type = 'estimate'
        and status = 'review_required'
        and exists (
          select 1 from public.estimates estimate
          where estimate.id = public.ai_estimate_sources.imported_estimate_id
            and estimate.organization_id = public.ai_estimate_sources.organization_id
        )
      )
    )
  );
create policy ai_estimate_sources_update on public.ai_estimate_sources for update to authenticated
  using (
    uploaded_by = (select auth.uid())
    or public.auth_has_role_in_org(organization_id, array['owner','admin']::public.member_role[])
  )
  with check (
    organization_id in (select public.auth_org_ids())
    and (
      (uploaded_by = (select auth.uid()) and status <> 'approved')
      or public.auth_has_role_in_org(organization_id, array['owner','admin']::public.member_role[])
    )
  );
create policy ai_estimate_sources_delete on public.ai_estimate_sources for delete to authenticated
  using (
    uploaded_by = (select auth.uid())
    or public.auth_has_role_in_org(organization_id, array['owner','admin']::public.member_role[])
  );

create policy ai_estimate_extractions_select on public.ai_estimate_extractions for select to authenticated
  using (
    exists (
      select 1 from public.ai_estimate_sources source
      where source.id = public.ai_estimate_extractions.source_id
        and source.organization_id in (select public.auth_org_ids())
        and (
          source.uploaded_by = (select auth.uid())
          or public.auth_has_role_in_org(source.organization_id, array['owner','admin']::public.member_role[])
        )
    )
  );
create policy ai_estimate_extractions_write on public.ai_estimate_extractions for all to authenticated
  using (
    exists (
      select 1 from public.ai_estimate_sources source
      where source.id = public.ai_estimate_extractions.source_id
        and (
          source.uploaded_by = (select auth.uid())
          or public.auth_has_role_in_org(source.organization_id, array['owner','admin']::public.member_role[])
        )
    )
  )
  with check (
    exists (
      select 1 from public.ai_estimate_sources source
      where source.id = public.ai_estimate_extractions.source_id
        and source.organization_id = public.ai_estimate_extractions.organization_id
        and (
          source.uploaded_by = (select auth.uid())
          or public.auth_has_role_in_org(source.organization_id, array['owner','admin']::public.member_role[])
        )
    )
  );
create policy ai_estimate_examples_select on public.ai_estimate_examples for select to authenticated
  using (
    organization_id in (select public.auth_org_ids())
    and (
      visibility = 'organization'
      or owner_user_id = (select auth.uid())
      or public.auth_has_role_in_org(organization_id, array['owner','admin']::public.member_role[])
    )
  );
create policy ai_estimate_examples_admin_write on public.ai_estimate_examples for all to authenticated
  using (public.auth_has_role_in_org(organization_id, array['owner','admin']::public.member_role[]))
  with check (public.auth_has_role_in_org(organization_id, array['owner','admin']::public.member_role[]));
create policy ai_estimate_example_lines_select on public.ai_estimate_example_lines for select to authenticated
  using (
    exists (
      select 1 from public.ai_estimate_examples example
      where example.id = public.ai_estimate_example_lines.example_id
        and example.organization_id in (select public.auth_org_ids())
        and (
          example.visibility = 'organization'
          or example.owner_user_id = (select auth.uid())
          or public.auth_has_role_in_org(example.organization_id, array['owner','admin']::public.member_role[])
        )
    )
  );
create policy ai_estimate_example_lines_admin_write on public.ai_estimate_example_lines for all to authenticated
  using (public.auth_has_role_in_org(organization_id, array['owner','admin']::public.member_role[]))
  with check (public.auth_has_role_in_org(organization_id, array['owner','admin']::public.member_role[]));
create policy ai_estimate_chunks_select on public.ai_estimate_chunks for select to authenticated
  using (
    exists (
      select 1 from public.ai_estimate_examples example
      where example.id = public.ai_estimate_chunks.example_id
        and example.organization_id in (select public.auth_org_ids())
        and (
          example.visibility = 'organization'
          or example.owner_user_id = (select auth.uid())
          or public.auth_has_role_in_org(example.organization_id, array['owner','admin']::public.member_role[])
        )
    )
  );
create policy ai_estimate_chunks_admin_write on public.ai_estimate_chunks for all to authenticated
  using (public.auth_has_role_in_org(organization_id, array['owner','admin']::public.member_role[]))
  with check (public.auth_has_role_in_org(organization_id, array['owner','admin']::public.member_role[]));
create policy ai_estimate_price_stats_select on public.ai_estimate_price_stats for select to authenticated
  using (organization_id in (select public.auth_org_ids()));
create policy ai_estimate_price_stats_admin_write on public.ai_estimate_price_stats for all to authenticated
  using (public.auth_has_role_in_org(organization_id, array['owner','admin']::public.member_role[]))
  with check (public.auth_has_role_in_org(organization_id, array['owner','admin']::public.member_role[]));
create policy ai_estimate_suggestions_org on public.ai_estimate_suggestions for all to authenticated
  using (organization_id in (select public.auth_org_ids()) and requested_by = (select auth.uid()))
  with check (organization_id in (select public.auth_org_ids()) and requested_by = (select auth.uid()));
create policy ai_estimate_settings_select on public.ai_estimate_settings for select to authenticated
  using (organization_id in (select public.auth_org_ids()));
create policy ai_estimate_settings_admin_write on public.ai_estimate_settings for all to authenticated
  using (public.auth_has_role_in_org(organization_id, array['owner','admin']::public.member_role[]))
  with check (public.auth_has_role_in_org(organization_id, array['owner','admin']::public.member_role[]));

grant select, insert, update, delete on public.ai_estimate_sources to authenticated;
grant select, insert, update, delete on public.ai_estimate_extractions to authenticated;
grant select, insert, update, delete on public.ai_estimate_examples to authenticated;
grant select, insert, update, delete on public.ai_estimate_example_lines to authenticated;
grant select, insert, update, delete on public.ai_estimate_chunks to authenticated;
grant select, insert, update, delete on public.ai_estimate_price_stats to authenticated;
grant select, insert, update, delete on public.ai_estimate_suggestions to authenticated;
grant select, insert, update, delete on public.ai_estimate_settings to authenticated;
grant select, insert, update, delete on public.ai_estimate_sources, public.ai_estimate_extractions,
  public.ai_estimate_examples, public.ai_estimate_example_lines, public.ai_estimate_chunks,
  public.ai_estimate_price_stats, public.ai_estimate_suggestions, public.ai_estimate_settings to service_role;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('ai-estimate-sources', 'ai-estimate-sources', false, 20971520,
  array['application/pdf','image/png','image/jpeg'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy ai_estimate_source_objects_insert on storage.objects for insert to authenticated
  with check (
    bucket_id = 'ai-estimate-sources'
    and (storage.foldername(name))[1]::uuid in (select public.auth_org_ids())
  );
create policy ai_estimate_source_objects_select on storage.objects for select to authenticated
  using (
    bucket_id = 'ai-estimate-sources'
    and exists (
      select 1 from public.ai_estimate_sources source
      where source.storage_path = storage.objects.name
        and source.organization_id in (select public.auth_org_ids())
        and (
          source.uploaded_by = (select auth.uid())
          or public.auth_has_role_in_org(source.organization_id, array['owner','admin']::public.member_role[])
        )
    )
  );
create policy ai_estimate_source_objects_delete on storage.objects for delete to authenticated
  using (
    bucket_id = 'ai-estimate-sources'
    and exists (
      select 1 from public.ai_estimate_sources source
      where source.storage_path = storage.objects.name
        and (
          source.uploaded_by = (select auth.uid())
          or public.auth_has_role_in_org(source.organization_id, array['owner','admin']::public.member_role[])
        )
    )
  );
