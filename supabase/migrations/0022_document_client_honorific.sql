alter table public.estimates
  add column if not exists show_client_honorific boolean not null default true;
alter table public.invoices
  add column if not exists show_client_honorific boolean not null default true;
alter table public.delivery_notes
  add column if not exists show_client_honorific boolean not null default true;
alter table public.receipts
  add column if not exists show_client_honorific boolean not null default true;
