-- Periodic invoicing runtime.
-- 0008 created periodic_invoice_schedules / _line_items but nothing ran them.
-- This migration adds the columns the generator needs, plus Gmail send scope
-- tracking for the automatic email.

alter table public.periodic_invoice_schedules
  add column if not exists payment_day_mode text not null default 'day';
alter table public.periodic_invoice_schedules
  drop constraint if exists periodic_invoice_schedules_payment_day_mode_check;
alter table public.periodic_invoice_schedules
  add constraint periodic_invoice_schedules_payment_day_mode_check
  check (payment_day_mode in ('day', 'last'));

-- Copied onto every generated invoice so the output matches what the user set up.
alter table public.periodic_invoice_schedules
  add column if not exists output_locale text not null default 'ja';
alter table public.periodic_invoice_schedules
  drop constraint if exists periodic_invoice_schedules_output_locale_check;
alter table public.periodic_invoice_schedules
  add constraint periodic_invoice_schedules_output_locale_check
  check (output_locale in ('ko', 'ja', 'en'));

alter table public.periodic_invoice_schedules
  add column if not exists show_client_honorific boolean not null default true;
alter table public.periodic_invoice_schedules
  add column if not exists remarks text;
alter table public.periodic_invoice_schedules
  add column if not exists internal_memo text;
alter table public.periodic_invoice_schedules
  add column if not exists created_by uuid references auth.users(id);

-- Per-schedule failure isolation: one bad schedule must not stop the run.
alter table public.periodic_invoice_schedules
  add column if not exists last_error text;
alter table public.periodic_invoice_schedules
  add column if not exists last_error_at timestamptz;

-- Gmail send (the connection used to be read-only).
alter table public.gmail_connections
  add column if not exists scopes text[];
alter table public.gmail_connections
  add column if not exists last_send_at timestamptz;
alter table public.gmail_connections
  add column if not exists last_send_error text;

-- The cron runner numbers documents with the service role, which has no
-- auth.uid(); next_document_number already takes the org explicitly.
grant execute on function public.next_document_number(uuid, text, date) to service_role;
