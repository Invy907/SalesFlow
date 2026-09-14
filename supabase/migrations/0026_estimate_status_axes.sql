-- 見積書の「発行」バッジ専用フラグ。既存の status(draft/issued/sent/confirmed/overdue) は
-- 未処理/処理済みタブの分類に使われており中間状態も持つため、タブとは独立した単純な
-- 2状態トグル用に別カラムを設ける。タイムスタンプ有無 = 完了(既存の ordered_at と同じスタイル)。
alter table public.estimates
  add column if not exists issue_marked_at timestamptz;
