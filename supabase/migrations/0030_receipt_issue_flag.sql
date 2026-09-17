-- 領収書一覧の「発行」ステータスバッジ用フラグ。
-- 領収書は入金後に発行するものなので入金ステータスは持たせず、発行の単純な2状態トグルのみ
-- (見積書の issue_marked_at と同じスタイル。0026_estimate_status_axes.sql 参照)。
alter table public.receipts
  add column if not exists issued_marked_at timestamptz;
