-- 0006_storage_buckets.sql
-- Org-scoped storage for logos, seals, imports

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('org-logos', 'org-logos', true, 1048576, array['image/png','image/jpeg','image/gif','image/webp']),
  ('org-seals', 'org-seals', false, 1048576, array['image/png','image/jpeg','image/gif','image/webp']),
  ('document-assets', 'document-assets', false, 10485760, array['image/png','image/jpeg','image/gif','image/webp','application/pdf']),
  ('csv-imports', 'csv-imports', false, 5242880, array['text/csv','application/vnd.ms-excel']),
  ('order-form-logos', 'order-form-logos', true, 1048576, array['image/png','image/jpeg','image/gif','image/webp'])
on conflict (id) do nothing;

create policy org_logos_select on storage.objects for select to authenticated
  using (bucket_id = 'org-logos');
create policy org_logos_insert on storage.objects for insert to authenticated
  with check (
    bucket_id = 'org-logos'
    and (storage.foldername(name))[1]::uuid in (select auth_org_ids())
  );
create policy org_logos_update on storage.objects for update to authenticated
  using (
    bucket_id = 'org-logos'
    and (storage.foldername(name))[1]::uuid in (select auth_org_ids())
  );
create policy org_logos_delete on storage.objects for delete to authenticated
  using (
    bucket_id = 'org-logos'
    and (storage.foldername(name))[1]::uuid in (select auth_org_ids())
  );

create policy org_seals_select on storage.objects for select to authenticated
  using (
    bucket_id = 'org-seals'
    and (storage.foldername(name))[1]::uuid in (select auth_org_ids())
  );
create policy org_seals_insert on storage.objects for insert to authenticated
  with check (
    bucket_id = 'org-seals'
    and (storage.foldername(name))[1]::uuid in (select auth_org_ids())
  );
create policy org_seals_delete on storage.objects for delete to authenticated
  using (
    bucket_id = 'org-seals'
    and (storage.foldername(name))[1]::uuid in (select auth_org_ids())
  );

create policy csv_imports_select on storage.objects for select to authenticated
  using (
    bucket_id = 'csv-imports'
    and (storage.foldername(name))[1]::uuid in (select auth_org_ids())
  );
create policy csv_imports_insert on storage.objects for insert to authenticated
  with check (
    bucket_id = 'csv-imports'
    and (storage.foldername(name))[1]::uuid in (select auth_org_ids())
  );
create policy csv_imports_delete on storage.objects for delete to authenticated
  using (
    bucket_id = 'csv-imports'
    and (storage.foldername(name))[1]::uuid in (select auth_org_ids())
  );
