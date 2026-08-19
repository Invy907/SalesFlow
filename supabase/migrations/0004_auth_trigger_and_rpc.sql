-- 0004_auth_trigger_and_rpc.sql
-- Sign-up bootstrap + document numbering RPC

create or replace function public.seed_default_order_statuses(_org uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.order_statuses (organization_id, name, display_order, is_system, system_key)
  values
    (_org, '未処理', 1, true, 'unprocessed'),
    (_org, '処理済み', 2, true, 'processed'),
    (_org, 'ゴミ箱', 3, true, 'trash')
  on conflict (organization_id, system_key) do nothing;
end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  new_org_id uuid;
begin
  insert into public.profiles (id, email, display_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1))
  )
  on conflict (id) do update
    set email = excluded.email,
        display_name = coalesce(excluded.display_name, public.profiles.display_name);

  insert into public.organizations (name, plan)
  values (
    coalesce(new.raw_user_meta_data->>'org_name', 'My Workspace'),
    'free_trial'
  )
  returning id into new_org_id;

  insert into public.organization_members (organization_id, user_id, role)
  values (new_org_id, new.id, 'owner');

  insert into public.company_profiles (organization_id) values (new_org_id);
  insert into public.document_defaults (organization_id) values (new_org_id);
  insert into public.display_settings (organization_id) values (new_org_id);
  insert into public.feature_flags (organization_id) values (new_org_id);

  perform public.seed_default_order_statuses(new_org_id);

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

revoke all on function public.next_document_number(uuid, text, date) from public, anon;
grant execute on function public.next_document_number(uuid, text, date) to authenticated;
