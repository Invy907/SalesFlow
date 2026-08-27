-- Whether to print the company seal (印影) on a document.
-- The seal image itself lives in company_profiles.seal_path; this only decides
-- per document whether it is stamped. Default is on.

alter table public.estimates      add column if not exists show_seal boolean not null default true;
alter table public.invoices       add column if not exists show_seal boolean not null default true;
alter table public.delivery_notes add column if not exists show_seal boolean not null default true;
alter table public.receipts       add column if not exists show_seal boolean not null default true;
