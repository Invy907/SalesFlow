-- 0003_business_tables.sql
-- SalesFlow core business tables (adapted from raon-flow sf_* schema)

-- 024_salesflow_business_tables.sql
-- SalesFlow 비즈니스 테이블 (견적·청구·수주 등)
-- raon-flow의 각 유저는 가입 시 1개의 SalesFlow org가 자동 생성됨

-- company_profiles
create table if not exists public.company_profiles (
  organization_id uuid primary key references public.organizations(id) on delete cascade,
  postal_code text,
  address_line1 text,
  address_line2 text,
  address_line3 text,
  company_name_line1 text,
  company_name_line2 text,
  company_name_line3 text,
  tel text,
  fax text,
  email text,
  invoice_registration_number text,
  logo_path text,
  seal_path text,
  representative_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger company_profiles_updated_at
  before update on public.company_profiles
  for each row execute function public.set_updated_at();

-- document_defaults
create table if not exists public.document_defaults (
  organization_id uuid primary key references public.organizations(id) on delete cascade,
  numbering_rule text default '{Y}{M}{D}-{連番:M,3}',
  line_item_label_name text default '品名',
  line_item_label_qty text default '数量',
  line_item_label_price text default '単価',
  line_item_label_amount text default '金額',
  estimate_heading text default '見積書',
  estimate_message text,
  estimate_remarks text,
  delivery_note_message text,
  delivery_note_remarks text,
  invoice_message text,
  invoice_remarks text,
  receipt_message text,
  receipt_remarks text,
  estimate_template_key text default 'standard',
  delivery_note_template_key text default 'standard',
  invoice_template_key text default 'standard',
  receipt_template_key text default 'standard',
  tax_display_default public.tax_display_mode default 'separate',
  tax_rounding_default public.tax_rounding default 'round_down',
  withholding_default public.withholding_type default 'none',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- display_settings
create table if not exists public.display_settings (
  organization_id uuid primary key references public.organizations(id) on delete cascade,
  list_page_size smallint not null default 30 check (list_page_size in (30, 50, 100)),
  home_page_after_login text not null default 'home',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger display_settings_updated_at
  before update on public.display_settings
  for each row execute function public.set_updated_at();

create trigger document_defaults_updated_at
  before update on public.document_defaults
  for each row execute function public.set_updated_at();

-- feature_flags
create table if not exists public.feature_flags (
  organization_id uuid primary key references public.organizations(id) on delete cascade,
  flags jsonb not null default '{"mailingStatusEmail":true,"hideSalesflowLogo":false,"purchaseOrderPdf":false,"itemManagement":true,"orderButtonOnEstimate":true,"deliveryDatePerLineItem":false,"hideInvoiceCardPayment":false,"calendarSync":false}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger feature_flags_updated_at
  before update on public.feature_flags
  for each row execute function public.set_updated_at();

-- bank_accounts
create table if not exists public.bank_accounts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  display_order smallint check (display_order between 1 and 3),
  bank_name text,
  branch_name text,
  account_type text check (account_type in ('futsu', 'touza', 'chochiku')),
  account_number text,
  account_holder text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger bank_accounts_updated_at
  before update on public.bank_accounts
  for each row execute function public.set_updated_at();

-- clients
create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null check (char_length(name) <= 40),
  furigana text,
  corp_number text,
  management_code text,
  department text,
  email text,
  email_cc text[],
  phone text,
  fax text,
  honorific text,
  memo text,
  is_favorite boolean not null default false,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger clients_updated_at
  before update on public.clients
  for each row execute function public.set_updated_at();
create index if not exists clients_org_idx on public.clients(organization_id) where deleted_at is null;

-- client_destinations
create table if not exists public.client_destinations (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  label text,
  postal_code text,
  address_line1 text,
  address_line2 text,
  mailing_line1 text,
  mailing_line2 text,
  mailing_line3 text,
  mailing_line4 text,
  email text,
  email_cc text[],
  honorific text,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger client_destinations_updated_at
  before update on public.client_destinations
  for each row execute function public.set_updated_at();

-- items
create table if not exists public.items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null check (char_length(name) <= 255),
  unit text,
  unit_price bigint not null default 0,
  tax_category public.tax_category not null default 'follow_company',
  withholding_exempt boolean not null default false,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger items_updated_at
  before update on public.items
  for each row execute function public.set_updated_at();

-- estimates
create table if not exists public.estimates (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  client_id uuid references public.clients(id) on delete set null,
  client_destination_id uuid references public.client_destinations(id) on delete set null,
  document_number text not null,
  subject text check (char_length(subject) <= 70),
  issue_date date not null,
  status public.document_status not null default 'draft',
  internal_memo text,
  recipient_snapshot jsonb,
  sender_snapshot jsonb,
  tax_display public.tax_display_mode not null,
  tax_rounding public.tax_rounding not null,
  withholding_type public.withholding_type not null default 'none',
  template_key text,
  template_message text,
  remarks text,
  subtotal bigint not null default 0,
  tax_amount bigint not null default 0,
  total bigint generated always as (subtotal + tax_amount) stored,
  created_by uuid references auth.users(id),
  deleted_at timestamptz,
  share_token text unique,
  expiry_date date,
  ordered_at timestamptz,
  ordered_order_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger estimates_updated_at
  before update on public.estimates
  for each row execute function public.set_updated_at();
create index if not exists estimates_org_idx on public.estimates(organization_id, issue_date desc) where deleted_at is null;

-- estimate_line_items
create table if not exists public.estimate_line_items (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.estimates(id) on delete cascade,
  line_no smallint not null,
  item_id uuid references public.items(id) on delete set null,
  name_snapshot text not null,
  qty numeric(18,4) not null default 1,
  unit_snapshot text,
  unit_price_snapshot bigint not null,
  tax_category public.tax_category not null,
  tax_rate_snapshot numeric(5,4) not null,
  withholding_exempt_snapshot boolean,
  line_subtotal bigint generated always as (floor(qty * unit_price_snapshot)::bigint) stored,
  unique (document_id, line_no)
);

-- invoices
create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  client_id uuid references public.clients(id) on delete set null,
  client_destination_id uuid references public.client_destinations(id) on delete set null,
  document_number text not null,
  subject text check (char_length(subject) <= 70),
  issue_date date not null,
  status public.document_status not null default 'draft',
  internal_memo text,
  recipient_snapshot jsonb,
  sender_snapshot jsonb,
  tax_display public.tax_display_mode not null,
  tax_rounding public.tax_rounding not null,
  withholding_type public.withholding_type not null default 'none',
  template_key text,
  template_message text,
  remarks text,
  subtotal bigint not null default 0,
  tax_amount bigint not null default 0,
  total bigint generated always as (subtotal + tax_amount) stored,
  created_by uuid references auth.users(id),
  deleted_at timestamptz,
  share_token text unique,
  payment_due date,
  delivery_date date,
  billing_month text,
  payment_option public.payment_option not null default 'none',
  bank_account_ids uuid[],
  paid_amount bigint not null default 0,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger invoices_updated_at
  before update on public.invoices
  for each row execute function public.set_updated_at();
create index if not exists invoices_org_idx on public.invoices(organization_id, issue_date desc) where deleted_at is null;

-- invoice_line_items
create table if not exists public.invoice_line_items (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.invoices(id) on delete cascade,
  line_no smallint not null,
  item_id uuid references public.items(id) on delete set null,
  name_snapshot text not null,
  qty numeric(18,4) not null default 1,
  unit_snapshot text,
  unit_price_snapshot bigint not null,
  tax_category public.tax_category not null,
  tax_rate_snapshot numeric(5,4) not null,
  withholding_exempt_snapshot boolean,
  line_subtotal bigint generated always as (floor(qty * unit_price_snapshot)::bigint) stored,
  unique (document_id, line_no)
);

-- delivery_notes
create table if not exists public.delivery_notes (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  client_id uuid references public.clients(id) on delete set null,
  document_number text not null,
  subject text check (char_length(subject) <= 70),
  issue_date date not null,
  status public.document_status not null default 'draft',
  internal_memo text,
  recipient_snapshot jsonb,
  sender_snapshot jsonb,
  tax_display public.tax_display_mode not null,
  tax_rounding public.tax_rounding not null,
  withholding_type public.withholding_type not null default 'none',
  template_key text,
  template_message text,
  remarks text,
  subtotal bigint not null default 0,
  tax_amount bigint not null default 0,
  total bigint generated always as (subtotal + tax_amount) stored,
  created_by uuid references auth.users(id),
  deleted_at timestamptz,
  delivery_date date,
  linked_invoice_id uuid references public.invoices(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger delivery_notes_updated_at
  before update on public.delivery_notes
  for each row execute function public.set_updated_at();

-- delivery_note_line_items
create table if not exists public.delivery_note_line_items (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.delivery_notes(id) on delete cascade,
  line_no smallint not null,
  item_id uuid references public.items(id) on delete set null,
  name_snapshot text not null,
  qty numeric(18,4) not null default 1,
  unit_snapshot text,
  unit_price_snapshot bigint not null,
  tax_category public.tax_category not null,
  tax_rate_snapshot numeric(5,4) not null,
  withholding_exempt_snapshot boolean,
  line_subtotal bigint generated always as (floor(qty * unit_price_snapshot)::bigint) stored,
  unique (document_id, line_no)
);

-- receipts
create table if not exists public.receipts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  client_id uuid references public.clients(id) on delete set null,
  document_number text not null,
  subject text check (char_length(subject) <= 70),
  issue_date date not null,
  status public.document_status not null default 'draft',
  internal_memo text,
  recipient_snapshot jsonb,
  sender_snapshot jsonb,
  tax_display public.tax_display_mode not null,
  tax_rounding public.tax_rounding not null,
  withholding_type public.withholding_type not null default 'none',
  template_key text,
  template_message text,
  remarks text,
  subtotal bigint not null default 0,
  tax_amount bigint not null default 0,
  total bigint generated always as (subtotal + tax_amount) stored,
  created_by uuid references auth.users(id),
  deleted_at timestamptz,
  transaction_date date,
  linked_invoice_id uuid references public.invoices(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger receipts_updated_at
  before update on public.receipts
  for each row execute function public.set_updated_at();

-- receipt_line_items
create table if not exists public.receipt_line_items (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.receipts(id) on delete cascade,
  line_no smallint not null,
  item_id uuid references public.items(id) on delete set null,
  name_snapshot text not null,
  qty numeric(18,4) not null default 1,
  unit_snapshot text,
  unit_price_snapshot bigint not null,
  tax_category public.tax_category not null,
  tax_rate_snapshot numeric(5,4) not null,
  withholding_exempt_snapshot boolean,
  line_subtotal bigint generated always as (floor(qty * unit_price_snapshot)::bigint) stored,
  unique (document_id, line_no)
);

-- payments
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  invoice_id uuid not null references public.invoices(id) on delete cascade,
  client_id uuid references public.clients(id) on delete set null,
  paid_at date not null,
  amount bigint not null,
  method text check (method in ('bank', 'card', 'cash', 'other')),
  memo text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger payments_updated_at
  before update on public.payments
  for each row execute function public.set_updated_at();

-- order_statuses
create table if not exists public.order_statuses (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  display_order smallint,
  is_system boolean not null default false,
  system_key public.order_system_status,
  color text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, system_key)
);
create trigger order_statuses_updated_at
  before update on public.order_statuses
  for each row execute function public.set_updated_at();

-- orders
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  client_id uuid references public.clients(id) on delete set null,
  order_number text not null,
  order_date date not null,
  delivery_date date,
  subject text,
  status_id uuid references public.order_statuses(id) on delete set null,
  comment text,
  source_estimate_id uuid references public.estimates(id) on delete set null,
  subtotal bigint not null default 0,
  tax_amount bigint not null default 0,
  total bigint generated always as (subtotal + tax_amount) stored,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger orders_updated_at
  before update on public.orders
  for each row execute function public.set_updated_at();

-- order_line_items
create table if not exists public.order_line_items (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.orders(id) on delete cascade,
  line_no smallint not null,
  item_id uuid references public.items(id) on delete set null,
  name_snapshot text not null,
  qty numeric(18,4) not null default 1,
  unit_snapshot text,
  unit_price_snapshot bigint not null,
  tax_category public.tax_category not null,
  tax_rate_snapshot numeric(5,4) not null,
  withholding_exempt_snapshot boolean,
  line_subtotal bigint generated always as (floor(qty * unit_price_snapshot)::bigint) stored,
  unique (document_id, line_no)
);

-- document_sequences (채번)
create table if not exists public.document_sequences (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  doc_type text not null check (doc_type in ('estimate', 'delivery_note', 'invoice', 'receipt', 'order')),
  date_key text not null,
  last_seq int not null default 0,
  primary key (organization_id, doc_type, date_key)
);

-- next_document_number RPC
create or replace function public.next_document_number(
  _org uuid,
  _doc_type text,
  _issue_date date
) returns text
language plpgsql security definer set search_path = public
as $$
declare
  _date_key text := to_char(_issue_date, 'YYYYMMDD');
  _seq int;
  _lock_key bigint;
begin
  _lock_key := hashtextextended(_org::text || _doc_type || _date_key, 0);
  perform pg_advisory_xact_lock(_lock_key);

  insert into public.document_sequences (organization_id, doc_type, date_key, last_seq)
  values (_org, _doc_type, _date_key, 1)
  on conflict (organization_id, doc_type, date_key)
  do update set last_seq = public.document_sequences.last_seq + 1
  returning last_seq into _seq;

  return _date_key || '-' || lpad(_seq::text, 3, '0');
end;
$$;

-- inbox_messages
create table if not exists public.inbox_messages (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  kind text not null check (kind in ('received_document', 'system', 'announcement')),
  subject text,
  body text,
  payload jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists inbox_messages_org_idx on public.inbox_messages(organization_id, created_at desc);
