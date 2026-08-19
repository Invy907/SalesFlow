-- 0014_security_hardening.sql
-- Findings from the Supabase database linter.
--
-- Functions default to EXECUTE for PUBLIC, which puts every one of them on
-- /rest/v1/rpc/<name>. Trigger bodies and internal helpers have no business
-- being callable that way; seed_default_order_statuses was the sharp edge, since
-- it takes an org id and runs as its owner, so any signed-in user could have
-- seeded rows into someone else's organization.
--
-- Revoking EXECUTE does not affect the triggers: PostgreSQL checks that
-- privilege when the trigger is created, not each time it fires.

alter function public.set_updated_at() set search_path = public;

revoke all on function public.set_updated_at() from public, anon, authenticated;
revoke all on function public.handle_new_user() from public, anon, authenticated;
revoke all on function public.seed_default_order_statuses(uuid) from public, anon, authenticated;
revoke all on function public.recalculate_document_totals() from public, anon, authenticated;
revoke all on function public.recalculate_invoice_paid_amount() from public, anon, authenticated;
revoke all on function public.enforce_bank_account_limit() from public, anon, authenticated;

-- RLS helpers must stay executable by signed-in users, because policies are
-- evaluated with the caller's privileges. Unauthenticated callers only ever get
-- an empty result from them, so drop the access rather than leave it exposed.
revoke all on function public.auth_org_ids() from public, anon;
grant execute on function public.auth_org_ids() to authenticated;

revoke all on function public.auth_has_role_in_org(uuid, public.member_role[]) from public, anon;
grant execute on function public.auth_has_role_in_org(uuid, public.member_role[]) to authenticated;

-- citext landed in public because 0001 created it there; Supabase keeps
-- extensions out of the API-exposed schema.
do $$ begin
  alter extension citext set schema extensions;
exception when others then null; end $$;
