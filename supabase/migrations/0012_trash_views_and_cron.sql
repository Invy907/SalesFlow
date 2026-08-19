-- 0012_trash_views_and_cron.sql
-- Trash views (spec 11.2) and the 30-day purge job (spec 11.3).

-- security_invoker keeps RLS on the underlying tables in effect; without it the
-- view would run as its owner and leak other orgs' trashed documents.
create or replace view public.estimates_trashed with (security_invoker = on) as
  select * from public.estimates
  where deleted_at is not null and deleted_at > now() - interval '30 days';

create or replace view public.delivery_notes_trashed with (security_invoker = on) as
  select * from public.delivery_notes
  where deleted_at is not null and deleted_at > now() - interval '30 days';

create or replace view public.invoices_trashed with (security_invoker = on) as
  select * from public.invoices
  where deleted_at is not null and deleted_at > now() - interval '30 days';

create or replace view public.receipts_trashed with (security_invoker = on) as
  select * from public.receipts
  where deleted_at is not null and deleted_at > now() - interval '30 days';

create or replace view public.orders_trashed with (security_invoker = on) as
  select * from public.orders
  where deleted_at is not null and deleted_at > now() - interval '30 days';

create extension if not exists pg_cron;

create or replace function public.purge_trashed_documents()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.estimates where deleted_at < now() - interval '30 days';
  delete from public.delivery_notes where deleted_at < now() - interval '30 days';
  delete from public.invoices where deleted_at < now() - interval '30 days';
  delete from public.receipts where deleted_at < now() - interval '30 days';
  delete from public.orders where deleted_at < now() - interval '30 days';
  delete from public.clients where deleted_at < now() - interval '30 days';
  delete from public.items where deleted_at < now() - interval '30 days';
end;
$$;

revoke all on function public.purge_trashed_documents() from public, anon, authenticated;

-- 03:00 UTC daily. Re-running the migration must not stack duplicate jobs.
do $$ begin
  perform cron.unschedule('purge_trashed_documents_daily');
exception when others then null; end $$;

select cron.schedule(
  'purge_trashed_documents_daily',
  '0 3 * * *',
  $$select public.purge_trashed_documents();$$
);
