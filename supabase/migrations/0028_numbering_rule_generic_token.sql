-- 依頼1: 採番テンプレートの連番トークンを名前非依存にする。
-- 0015_numbering_rule_tokens.sql のRPCはトークン名を厳密に "連番" とだけ照合していたため、
-- ある組織の numbering_rule に別名(例: {XXXX:M,3})が入っていると {Y}{M}{D} は展開されても
-- 連番部分だけ未展開の文字列("20260828-{XXXX:M,3}"のような形)がそのまま保存/表示されていた。
-- トークン名を問わず {なにか:Y|M|D|A,桁数} の形なら連番トークンとして認識するよう緩和する。
-- pg_advisory_xact_lock と (_org, _doc_type, date_key) によるシーケンス採番の仕組みは変更しない。

create or replace function public.next_document_number(
  _org uuid,
  _doc_type text,
  _issue_date date
) returns text
language plpgsql security definer set search_path = public
as $$
declare
  _rule     text;
  _scope    text := 'M';
  _digits   int  := 3;
  _date_key text;
  _seq      int;
  _lock_key bigint;
  _m        text[];
begin
  select coalesce(numbering_rule, '{Y}{M}{D}-{連番:M,3}')
    into _rule
    from public.document_defaults
   where organization_id = _org;

  _rule := coalesce(_rule, '{Y}{M}{D}-{連番:M,3}');

  _m := regexp_match(_rule, '\{[^{}:]+:([YMDA]),(\d+)\}');
  if _m is not null then
    _scope  := _m[1];
    _digits := greatest(1, least(9, _m[2]::int));
  end if;

  _date_key := case _scope
    when 'Y' then to_char(_issue_date, 'YYYY')
    when 'M' then to_char(_issue_date, 'YYYYMM')
    when 'D' then to_char(_issue_date, 'YYYYMMDD')
    else '-'
  end;

  _lock_key := hashtextextended(_org::text || _doc_type || _date_key, 0);
  perform pg_advisory_xact_lock(_lock_key);

  insert into public.document_sequences (organization_id, doc_type, date_key, last_seq)
  values (_org, _doc_type, _date_key, 1)
  on conflict (organization_id, doc_type, date_key)
  do update set last_seq = public.document_sequences.last_seq + 1
  returning last_seq into _seq;

  return regexp_replace(
    replace(
      replace(
        replace(_rule, '{Y}', to_char(_issue_date, 'YYYY')),
        '{M}', to_char(_issue_date, 'MM')),
      '{D}', to_char(_issue_date, 'DD')),
    '\{[^{}:]+:[YMDA],\d+\}',
    lpad(_seq::text, _digits, '0')
  );
end;
$$;
