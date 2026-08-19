-- 0008_order_forms_and_periodic.sql
-- Public order forms (spec 4.7) and periodic invoicing (spec 4.5).

create table if not exists public.order_forms (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text,
  client_name_required boolean not null default true,
  subject text check (char_length(subject) <= 70),
  logo_path text,
  expiration_mode text not null default 'none' check (expiration_mode in ('date', 'none')),
  expiration_date date,
  public_token text not null unique,
  is_published boolean not null default true,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger order_forms_updated_at
  before update on public.order_forms
  for each row execute function public.set_updated_at();

create index if not exists order_forms_org_idx
  on public.order_forms (organization_id) where deleted_at is null;

-- No qty column: the customer supplies quantities at submission time.
create table if not exists public.order_form_line_items (
  id uuid primary key default gen_random_uuid(),
  order_form_id uuid not null references public.order_forms(id) on delete cascade,
  line_no smallint not null,
  item_id uuid references public.items(id) on delete set null,
  name_snapshot text not null,
  unit_snapshot text,
  unit_price_snapshot bigint not null,
  tax_category public.tax_category not null,
  tax_rate_snapshot numeric(5,4) not null,
  unique (order_form_id, line_no)
);

create table if not exists public.order_form_submissions (
  id uuid primary key default gen_random_uuid(),
  order_form_id uuid not null references public.order_forms(id) on delete cascade,
  -- Denormalized so RLS can filter without joining the form.
  organization_id uuid not null references public.organizations(id) on delete cascade,
  client_name_input text,
  email_input text,
  phone_input text,
  payload jsonb,
  submitted_at timestamptz not null default now(),
  converted_order_id uuid references public.orders(id) on delete set null
);

create index if not exists order_form_submissions_org_idx
  on public.order_form_submissions (organization_id, submitted_at desc);

alter table public.orders
  add column if not exists order_time time,
  add column if not exists source_order_form_submission_id uuid
    references public.order_form_submissions(id) on delete set null;

-- estimates.ordered_order_id existed as a bare uuid because orders had not been
-- created yet at import time.
do $$ begin
  alter table public.estimates
    add constraint estimates_ordered_order_id_fkey
    foreign key (ordered_order_id) references public.orders(id) on delete set null;
exception when duplicate_object then null; end $$;

create table if not exists public.periodic_invoice_schedules (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  client_id uuid references public.clients(id) on delete set null,
  subject text check (char_length(subject) <= 70),
  start_date date not null,
  cycle public.periodic_cycle not null default 'monthly',
  day_mode text not null default 'day' check (day_mode in ('day', 'last')),
  day_value smallint check (day_value between 1 and 28),
  end_mode text not null default 'none' check (end_mode in ('none', 'date')),
  end_date date,
  payment_mode text not null default 'none' check (payment_mode in ('none', 'due')),
  payment_month text check (payment_month in ('current', 'next')),
  payment_day smallint check (payment_day between 1 and 28),
  email_enabled boolean not null default false,
  email_subject text,
  email_body text,
  tax_display public.tax_display_mode not null default 'separate',
  tax_rounding public.tax_rounding not null default 'round_down',
  withholding_type public.withholding_type not null default 'none',
  template_key text default 'standard',
  last_generated_at timestamptz,
  next_run_at timestamptz,
  is_paused boolean not null default false,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger periodic_invoice_schedules_updated_at
  before update on public.periodic_invoice_schedules
  for each row execute function public.set_updated_at();

-- Partial index drives the cron runner's "what is due" scan.
create index if not exists periodic_invoice_schedules_due_idx
  on public.periodic_invoice_schedules (next_run_at)
  where deleted_at is null and is_paused = false;

-- name_template keeps the pre-substitution text ({month}/{year}); the generated
-- invoice stores the resolved value in name_snapshot.
create table if not exists public.periodic_invoice_schedule_line_items (
  id uuid primary key default gen_random_uuid(),
  schedule_id uuid not null references public.periodic_invoice_schedules(id) on delete cascade,
  line_no smallint not null,
  item_id uuid references public.items(id) on delete set null,
  name_template text not null,
  qty numeric(18,4) not null default 1,
  unit_snapshot text,
  unit_price_snapshot bigint not null,
  tax_category public.tax_category not null,
  tax_rate_snapshot numeric(5,4) not null,
  withholding_exempt_snapshot boolean,
  line_subtotal bigint generated always as (floor(qty * unit_price_snapshot)::bigint) stored,
  unique (schedule_id, line_no)
);

alter table public.invoices
  add column if not exists periodic_schedule_id uuid
    references public.periodic_invoice_schedules(id) on delete set null;
