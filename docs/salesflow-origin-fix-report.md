# SalesFlow Origin Fix Report

## 적용 마이그레이션

| 순서 | 파일 | 내용 |
|------|------|------|
| 0015 | `supabase/migrations/0015_numbering_rule_tokens.sql` | `next_document_number`가 `document_defaults.numbering_rule` 토큰 `{Y}{M}{D}{連番:S,N}`을 해석. `pg_advisory_xact_lock` 유지 |

0016는 `0006_storage_buckets.sql`에 `org-logos`/`org-seals` 버킷이 이미 있으므로 생략.

## 배선한 화면

| 영역 | RSC 데이터 | Client |
|------|-----------|--------|
| 거래처 | `clients/page.tsx` → `getClients` | `clients-table.tsx`, `client-registration-modal.tsx` |
| 품목 | `items/page.tsx` → `getItems` | `items-table.tsx`, `item-form.tsx`, `bulk/page.tsx` |
| 견적 목록 | `estimates/page.tsx` | `estimates-list.tsx` |
| 견적 작성/편집 | `estimate-form-data.ts` | `estimate-form-client.tsx` |
| 견적 상세 | `estimates/[id]/page.tsx` | `estimate-detail-client.tsx` (발행/공유/메모) |
| 청구 목록 | `invoices/page.tsx` | `invoices-list.tsx` |
| 청구 신규 | `invoice-form-data.ts` | `invoice-form-client.tsx` |
| **홈** | `page.tsx` → `getDashboard` | `home-client.tsx` |
| **리포트** | `reports/page.tsx` 등 → `getMonthlyReport` / `getReceivablesReport` / `getCollectionsReport` | `reports-main-client.tsx`, `receivables-client.tsx`, `collections-client.tsx` |
| **발주** | `orders/page.tsx` → `getOrders` / `getOrderCounts` / `getOrderById` | `orders-client.tsx` |
| **납품서 목록** | `delivery-notes/page.tsx` → `getDeliveryNotes` | `delivery-notes-list.tsx` |
| **영수증 목록** | `receipts/page.tsx` → `getReceipts` | `receipts-list.tsx` |
| **수신함** | `inbox/page.tsx` → `getInboxMessages` | `inbox-list.tsx` |
| 자사정보 | `settings/company/page.tsx` | `company-form-client.tsx` + Storage 업로드 |
| 문서 초기설정 | `settings/document-defaults/page.tsx` | `document-defaults-form-client.tsx` |
| 입금계좌 | `settings/payment/page.tsx` | `payment-form-client.tsx` |
| 공유 열람 | `estimates/shared/[token]/page.tsx` | `get_shared_document` RPC |

### 신규 DB 레이어 (`src/lib/db/`)

- `dashboard.ts` — 홈 KPI·태스크 3그룹·최근 활동 (활성 org 전체 집계)
- `reports.ts` — 월별 청구/입금, 미수금, 회수예정 버킷
- `delivery-notes.ts`, `receipts.ts`, `inbox.ts`
- `orders.ts` — `getOrderCounts`, `getOrderById`, `trashed`/`query` 옵션 확장

공통: `new-document-shared.tsx` — `DocumentBottomBar` `onSave/pending/error`, `CommonLineItemsTable` `initialRows/onRowsChange`

## 멀티테넌트

- `getActiveOrganization()` + 쿠키 `salesflow-active-org`
- 모든 액션/DB 조회는 활성 `organization_id` 스코프
- RLS: `auth_org_ids()` — 기존 마이그레이션 유지 (117 싱글턴 포팅 없음)

## 남긴 것 (뮤테이션·범위 밖)

- 납품서·영수증 **저장**, 발주 **생성/상태 추가**, 수신함 **읽음 처리**
- 정기청구, CSV 청구, usage 집계, PDF 서버 렌더링, 메일/FAX 발송
- 문서 초기설정 UI 전체(납품/영수증 템플릿 블록) — 핵심 필드만 저장 연결
- `href="#"` 죽은 링크 — 지원·설정·가이드 라우트로 연결 또는 비활성 표시(월별 이용내역 네비, CSV 템플릿 다운로드)

## 검증

```bash
cd SalesFlow && npx tsc --noEmit && npm run build
```

2026-08-20 실데이터 배선 후 `tsc`·`build` 통과. `npm run lint`는 기존 파일(인증·shell·month-field-input 등)의 `react-hooks/set-state-in-effect` 규칙 위반이 남아 있음 — 이번 배선 변경분에서는 신규 lint 오류 없음.

### RLS 교차 조직 검증 (2026-08-20, salesflow-prod)

대상: `nothurjmqlfxjfkkvfxz` (salesflow-prod)

```bash
cd SalesFlow && npx supabase db query --linked -f supabase/tests/rls_cross_org_verification.sql
```

**결과: 18/18 PASS** (테스트 픽스처는 실행 후 자동 삭제)

| 테스트 | 결과 |
|--------|------|
| A → org B clients/estimates 조회 | 차단 (count=0) |
| A → org A clients/estimates/bank 조회 | 허용 |
| B → org A clients/bank 조회 | 차단 |
| C (org A 공동 멤버) → org A clients/items/company/estimates | 공유 허용 |
| C → org B clients | 차단 |
| A → org B client UPDATE | 차단 (row_count=0, 데이터 불변) |
| A → org B client INSERT | RLS로 차단 |
| `auth_org_ids()` A는 org B 미포함, org A 포함 | 정상 |
| `auth_org_ids()` C는 org A 포함 | 정상 |

**참고**: origin RLS는 문서(estimates)도 **org 멤버 전체 공유** (`estimates_org` 정책). 작성자 본인만 접근하는 author-only 정책은 적용되지 않음.

재실행 스크립트: `supabase/tests/rls_cross_org_verification.sql`
