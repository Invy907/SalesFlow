-- 依頼3: 「表示設定」の「最初に開くページ」を実際に選べるようにする。
-- home_page_after_login は既定値 'home' のままで自由入力だったため、
-- 画面が扱える値だけを受け付けるよう制約を付ける(ログイン後の遷移先に使う)。

alter table public.display_settings
  drop constraint if exists display_settings_home_page_after_login_check;

update public.display_settings
   set home_page_after_login = 'home'
 where home_page_after_login not in (
   'home', 'estimates', 'invoices', 'delivery_notes', 'receipts',
   'orders', 'reports', 'inbox', 'clients', 'items'
 );

alter table public.display_settings
  add constraint display_settings_home_page_after_login_check
  check (home_page_after_login in (
    'home', 'estimates', 'invoices', 'delivery_notes', 'receipts',
    'orders', 'reports', 'inbox', 'clients', 'items'
  ));

-- 表示件数の既定行が無い組織があると画面が空になるので補う。
insert into public.display_settings (organization_id)
select id from public.organizations
on conflict (organization_id) do nothing;
