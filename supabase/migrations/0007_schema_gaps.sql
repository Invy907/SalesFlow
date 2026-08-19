-- 0007_schema_gaps.sql
-- Columns, constraints and helpers from backend-spec sections 4.2-4.4 that the
-- initial table import did not cover.

-- CSV invoice import matches a client by management_code, so it must be unique
-- inside an org. Partial: blank codes and trashed clients are not keys.
create unique index if not exists clients_org_management_code_key
  on public.clients (organization_id, management_code)
  where management_code is not null and deleted_at is null;

alter table public.items
  add column if not exists tax_exempt_flag boolean;

alter table public.document_defaults
  add column if not exists category_format_always_print boolean not null default false;

alter table public.invoices
  add column if not exists card_payment_enabled boolean not null default false,
  add column if not exists card_qr_print boolean not null default false,
  add column if not exists gmo_pg_member_id text,
  add column if not exists category_format_always_print boolean not null default false;

-- Shared document header columns that only estimates/invoices had.
alter table public.delivery_notes
  add column if not exists client_destination_id uuid references public.client_destinations(id) on delete set null,
  add column if not exists share_token text;

alter table public.receipts
  add column if not exists client_destination_id uuid references public.client_destinations(id) on delete set null,
  add column if not exists share_token text;

create unique index if not exists delivery_notes_share_token_key
  on public.delivery_notes (share_token);
create unique index if not exists receipts_share_token_key
  on public.receipts (share_token);

create index if not exists delivery_notes_org_idx
  on public.delivery_notes (organization_id, issue_date desc) where deleted_at is null;
create index if not exists receipts_org_idx
  on public.receipts (organization_id, issue_date desc) where deleted_at is null;
create index if not exists orders_org_idx
  on public.orders (organization_id, order_date desc) where deleted_at is null;
create index if not exists payments_invoice_idx
  on public.payments (invoice_id);
create index if not exists payments_org_paid_idx
  on public.payments (organization_id, paid_at desc);
create index if not exists items_org_idx
  on public.items (organization_id) where deleted_at is null;

-- Publishing an order form and issuing documents both require a usable sender
-- block, so the check lives in the DB rather than in each caller.
create or replace function public.is_company_profile_complete(_org uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (
      select postal_code is not null
         and address_line1 is not null
         and company_name_line1 is not null
      from public.company_profiles
      where organization_id = _org
    ),
    false
  );
$$;

revoke all on function public.is_company_profile_complete(uuid) from public, anon;
grant execute on function public.is_company_profile_complete(uuid) to authenticated;

-- Invoice layout prints at most three accounts.
create or replace function public.enforce_bank_account_limit()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if (select count(*) from public.bank_accounts where organization_id = new.organization_id) >= 3 then
    raise exception 'An organization can register at most 3 bank accounts.';
  end if;
  return new;
end;
$$;

drop trigger if exists bank_accounts_limit on public.bank_accounts;
create trigger bank_accounts_limit
  before insert on public.bank_accounts
  for each row execute function public.enforce_bank_account_limit();
