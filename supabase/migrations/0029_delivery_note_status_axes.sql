-- 納品書一覧の「発行」「請求」ステータスバッジ用フラグ。
-- 既存の status(draft/issued/sent/confirmed/overdue) は未処理/処理済みタブの分類に
-- 使われており中間状態も持つため、タブとは独立した単純な2状態トグル用に
-- 別カラムを設ける(見積書の issue_marked_at / 請求書の issued_marked_at と同じスタイル。
-- 0026_estimate_status_axes.sql, 0027_invoice_status_badges.sql 参照)。
-- 発行は手動トグル、請求は「請求書に変換」実行時のみ自動で切り替わる表示専用バッジ。
alter table public.delivery_notes
  add column if not exists issued_marked_at timestamptz,
  add column if not exists billed_marked_at timestamptz;
