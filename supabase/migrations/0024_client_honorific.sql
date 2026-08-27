-- Client honorific choice (御中 / 様 / none).
-- Until now only show_client_honorific (boolean) existed, so the suffix was always 様
-- (님 in Korean output). The new default is 御中; existing documents keep what they show today.

do $$
declare
  _t text;
begin
  foreach _t in array array['estimates', 'invoices', 'delivery_notes', 'receipts'] loop
    execute format(
      'alter table public.%I add column if not exists client_honorific text not null default ''onchu''',
      _t
    );
    execute format(
      'alter table public.%I drop constraint if exists %I',
      _t, _t || '_client_honorific_check'
    );
    execute format(
      'alter table public.%I add constraint %I check (client_honorific in (''onchu'', ''sama'', ''none''))',
      _t, _t || '_client_honorific_check'
    );
    execute format(
      'update public.%I set client_honorific = case when show_client_honorific then ''sama'' else ''none'' end
         where client_honorific = ''onchu''',
      _t
    );
  end loop;
end $$;
