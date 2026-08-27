# 정기 청구(自動作成予約)

> 대상: SalesFlow 원본 프로젝트
> 통합판(raon-flow) 문서: `raon-flow/docs/salesflow-periodic-invoices.md`

거래처별로 "매월 25일" 같은 주기를 등록해 두면 cron 이 그 날짜에 청구서를 자동으로 만들고,
설정에 따라 Gmail 로 공유 링크를 보낸다.

`0008_order_forms_and_periodic.sql` 이 만들어 둔 테이블은 그대로 쓰고,
실행에 필요한 컬럼과 Gmail 발신 스코프만 `0023_periodic_invoice_runtime.sql` 에서 추가했다.

## 1. 데이터 모델

| 테이블 | 역할 |
| --- | --- |
| `periodic_invoice_schedules` | 예약 1건 (0008) |
| `periodic_invoice_schedule_line_items` | 예약 명세. 품명은 치환 전 `name_template` (0008) |
| `invoices.periodic_schedule_id` | 자동 생성된 청구서 → 예약 역참조 (0008) |

`0023_periodic_invoice_runtime.sql` 추가분

- 예약: `payment_day_mode`, `output_locale`, `show_client_honorific`, `remarks`, `internal_memo`,
  `created_by`, `last_error`, `last_error_at`
- Gmail: `gmail_connections.scopes / last_send_at / last_send_error`
- `next_document_number(uuid, text, date)` 에 `service_role` EXECUTE 부여 (cron 채번용)

RLS·grant 는 0011 / 0013 에 이미 있다(`organization_id in (select auth_org_ids())`).

마이그레이션 적용 후 `src/lib/supabase/database.types.ts` 를 재생성하는 것을 권장한다.
(이번 변경분은 손으로 반영해 두었다.)

`next_run_at` 은 **실행 날짜(JST)의 자정**을 timestamptz 로 저장한다.
cron 은 `next_run_at <= now()` 인 예약을 집어가고 실행 후 다음 날짜로 전진시킨다.
종료일을 넘어가면 `null` 이 되어 더 이상 돌지 않는다.

## 2. 도메인 로직 (`src/lib/periodic/`)

| 파일 | 내용 |
| --- | --- |
| `template-vars.ts` | `{month}` `{year}` (문서), `{client_name}` `{invoice_number}` `{share_url}` (메일) |
| `schedule-math.ts` | `computeFirstRunDate` / `computeNextRunDate` / `computeUpcomingRunAt` / `runAtFromDate` / `dateFromRunAt` |
| `payment-due.ts` | `computePaymentDue` |
| `generate-from-schedule.ts` | 예약 → 청구서 1건 생성 |
| `run-due-schedules.ts` | due 스케줄 일괄 실행(예약별 에러 격리) |
| `send-periodic-email.ts` | 생성 후 Gmail 발송 |

테스트: `schedule-math.test.ts`, `template-vars.test.ts` (`npm test` glob 에 포함).

### 실행일 규칙

- `monthly` — 매월 `day_value` 일. `day_mode = last` 면 그 달의 실제 말일(2월·윤년 반영)
- `yearly` — 시작일의 월, 매년 반복
- `weekly` — 시작일로부터 7일 간격(요일 유지)
- 예약 생성·수정 시 `next_run_at` 은 **오늘(JST) 이후 첫 실행일**로 계산한다.
  과거 시작일을 넣어도 지난 날짜의 청구서를 소급 생성하지 않는다.

## 3. 서버 액션 (`src/lib/actions/periodic-invoices.ts`)

`createPeriodicSchedule` / `updatePeriodicSchedule` / `pausePeriodicSchedule` /
`deletePeriodicSchedule`(soft delete) / `restorePeriodicSchedule`.

검증은 `src/lib/validators/periodic.ts` 의 zod 스키마
(`createPeriodicScheduleSchema`)가 담당하고, 문서 필드는 `createInvoiceSchema` 와 같은
하위 스키마(`lineItemSchema`, `taxDisplaySchema` …)를 재사용한다.

## 4. 화면

| 경로 | 내용 |
| --- | --- |
| `/[lang]/invoices/periodic` | 목록 · 휴지통, 검색, 다음 실행일·상태, 편집/일시정지/삭제 |
| `/[lang]/invoices/periodic/new` | 신규 등록(기본정보 · 과세설정 · 자동메일) |
| `/[lang]/invoices/periodic/[id]/edit` | 편집(같은 폼 컴포넌트) |
| `/[lang]/invoices/shared/[token]` | 자동 메일이 보내는 공개 열람 페이지 |

공개 열람은 기존 `share_tokens` + `get_shared_document(_token)` RPC 를 그대로 쓴다
(견적 공유와 동일한 경로).

## 5. Cron

`src/app/api/cron/periodic-invoices/route.ts`

- 인증: `Authorization: Bearer ${CRON_SECRET}` (gmail-sync 와 동일)
- 스케줄: `vercel.json` 의 `30 0 * * *` (UTC) = 매일 09:30 JST
- DB 접근은 `createSupabaseAdminClient()` (service role)

예약 하나가 실패해도 나머지는 계속 진행하고, 사유를 `last_error` 에 남긴다.
실패한 예약은 `next_run_at` 을 전진시키지 않으므로 다음 cron 에서 재시도한다.
자동 생성된 청구서는 `status = 'issued'` 로 들어간다.

수동 실행:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" https://<host>/api/cron/periodic-invoices
```

## 6. Gmail 자동 메일

기존 연동은 수신 전용(`gmail.readonly`)이었다. 발신을 위해 `gmail.send` 를 추가했다.

- `src/lib/gmail/oauth.ts` — `GMAIL_SCOPES = [readonly, send]`, 동의한 스코프를 `gmail_connections.scopes` 에 저장
- `src/lib/gmail/send.ts` — MIME 조립 후 `users.messages.send`
- 수신함에서 send 스코프가 없으면 **"발송 권한 재연동"** 배너가 뜬다.
  스코프 추가 전에 연동한 계정은 반드시 한 번 재연동해야 한다.

발송 스킵 사유: `disabled` / `no_client_email` / `no_gmail_connection` /
`gmail_send_scope_missing` / `send_failed`.
**메일이 안 나가도 청구서 생성은 유지된다.**

1차 범위는 공유 링크만 보낸다. PDF 첨부는 서버 PDF 렌더러가 생긴 뒤 2차.

## 7. 배포 체크리스트

1. `0023_periodic_invoice_runtime.sql` 적용
2. `database.types.ts` 재생성
3. Google OAuth 동의 화면에 `gmail.send` 스코프 추가
4. 수신함에서 Gmail 재연동
5. 예약을 하나 만들고 `curl` 로 cron 수동 호출 → 생성·메일 확인
