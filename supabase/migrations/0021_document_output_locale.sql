-- 문서별 출력 언어. 화면 언어와 분리하여 인쇄/PDF/공유 링크에서도 같은 언어를 유지한다.

alter table public.estimates
  add column if not exists output_locale text not null default 'ja';
alter table public.invoices
  add column if not exists output_locale text not null default 'ja';
alter table public.delivery_notes
  add column if not exists output_locale text not null default 'ja';
alter table public.receipts
  add column if not exists output_locale text not null default 'ja';

alter table public.estimates
  drop constraint if exists estimates_output_locale_check;
alter table public.estimates
  add constraint estimates_output_locale_check check (output_locale in ('ko', 'ja', 'en'));

alter table public.invoices
  drop constraint if exists invoices_output_locale_check;
alter table public.invoices
  add constraint invoices_output_locale_check check (output_locale in ('ko', 'ja', 'en'));

alter table public.delivery_notes
  drop constraint if exists delivery_notes_output_locale_check;
alter table public.delivery_notes
  add constraint delivery_notes_output_locale_check check (output_locale in ('ko', 'ja', 'en'));

alter table public.receipts
  drop constraint if exists receipts_output_locale_check;
alter table public.receipts
  add constraint receipts_output_locale_check check (output_locale in ('ko', 'ja', 'en'));
