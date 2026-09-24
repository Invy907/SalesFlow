-- Prove why user_id must accompany the membership read under organization RLS.
begin;
insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data)
values
 ('00000000-0000-4000-8000-000000003211', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'membership-owner@example.invalid', '{}'),
 ('00000000-0000-4000-8000-000000003212', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'membership-viewer@example.invalid', '{}');
insert into public.organization_members(organization_id, user_id, role)
select organization_id, '00000000-0000-4000-8000-000000003212', 'viewer'
from public.organization_members where user_id = '00000000-0000-4000-8000-000000003211';
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000003212', true);
set local role authenticated;
do $$
declare _org uuid; _role public.member_role;
begin
  select organization_id into _org from public.organization_members where user_id = auth.uid() and role = 'viewer';
  assert (select count(*) from public.organization_members where organization_id = _org) = 2,
    'RLS permits reading fellow organization members';
  select role into strict _role from public.organization_members where organization_id = _org and user_id = auth.uid();
  assert _role = 'viewer', 'current-user filter returns the actual role';
  assert not public.auth_has_role_in_org(_org, array['owner','admin']::public.member_role[]),
    'viewer cannot inherit another member owner/admin role';
  assert (select count(*) from public.profiles where id in (select user_id from public.organization_members where organization_id = _org)) = 2,
    'same-organization profile names are readable under the existing co-member policy';
  raise notice 'Organization membership regression checks passed';
end;
$$;
rollback;
