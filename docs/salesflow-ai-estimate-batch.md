# SalesFlow AI 견적 배치 (과거 스캔 견적서 일괄 분석)

과거 스캔 견적서 약 5,000건을 **Gemini API**로 분석해 SalesFlow AI 견적 검색·가격 통계
데이터를 만드는 배치 프로그램. Claude API 는 쓰지 않는다.

- 대상 프로젝트: **SalesFlow 원본**. pipeflow 는 건드리지 않는다.
- DB: SalesFlow Supabase, 테이블 접두어 `ai_estimate_`
- 통화·세율: **JPY / 일본 세율**(`tax_category`). 기존 SalesFlow 구현과 동일.

## 1. 기존 구현과의 관계 (중요)

0016 마이그레이션에 AI 견적 스키마와 ai-library UI 가 **이미 존재한다**. 배치는 그것을
대체하지 않고 확장한다.

| 이미 있던 것 | 배치가 하는 일 |
|---|---|
| `ai_estimate_sources` (+ Storage 버킷, RLS) | 그대로 사용. `ingest_origin`/`ingest_ref`/`page_count` 만 추가 |
| `ai_estimate_extractions` (source_id UNIQUE) | **현재 유효한 추출 1건**이라는 기존 역할 유지. UI가 읽는 곳 |
| `processor.ts` 의 placeholder 추출 | UI fallback으로 유지하고, 배치 실행기가 Gemini 실제 추출을 저장 |
| `ai_estimate_examples` / `_example_lines` | 승인된 데이터만 여기로. printed/computed 금액 컬럼 추가 |
| `ai_estimate_chunks.embedding` (jsonb) | `embedding_vector`(pgvector 1536) 추가. jsonb 는 남겨둠 |
| `market-research.ts` (기존 OpenAI) | Gemini Google Search Grounding으로 교체. AI 키를 Gemini 하나로 통일 |

### 0019 마이그레이션이 추가하는 것

- `ai_estimate_batch_runs` — 배치 실행 단위, 토큰·비용 집계
- `ai_estimate_jobs` — 문서별 13종 처리 상태의 SSOT (`sources.status` 6종은 legacy 로 매핑)
- `ai_estimate_extraction_runs` — Gemini 호출 이력. **원본 출력(raw_output)을 절대 덮어쓰지 않는다**
- `ai_estimate_review_edits` — 사람 수정 감사(누가·언제·왜·before/after)
- `ai_estimate_standard_items` / `_item_aliases` — 표준 품목과 별칭. **AI 는 candidate 까지만 만들고 병합은 사람이 승인**
- `ai_estimate_search_chunks(uuid, text, integer)` — 조직 격리가 적용된 pgvector 코사인 검색 RPC
- `ai_estimate_claim_jobs(...)` — `FOR UPDATE SKIP LOCKED` 기반 원자적 job 선점
- `ai_estimate_rebuild_price_stats(uuid)` — 승인 자료만 사용하는 가격 통계 재생성

## 2. 3중 보존 구조

```
ai_estimate_extraction_runs.raw_output        <- Gemini 원본 (불변)
ai_estimate_extraction_runs.normalized_output <- 자동 정규화 결과
ai_estimate_extractions.extracted_data        <- 사람 검수 후 최종 (source_of_truth='human')
ai_estimate_review_edits                      <- 누가·언제·왜 바꿨는지
```

Gemini API 호출은 `(source_id, prompt_version, model, attempt)`마다 새 행으로 추가한다.
재시도는 이전 `raw_output`을 갱신하지 않는다.

금액도 분리한다.

```
printed_amount   문서에 인쇄된 금액 (Gemini 가 읽은 값)
computed_amount  quantity x unit_price 계산값
amount_delta     printed - computed   (0 이 아니면 needs_review)
```

## 3. 처리 상태

```
uploaded -> queued -> extracting -> extracted -> validating
         -> needs_review | approved -> indexing -> indexed
```

실패/제외: `failed_retryable`, `failed_permanent`, `rejected`, `duplicate`

허용된 전이는 `lib/salesflow/ai/estimates/batch/status.ts` 의 전이표를 Repository가 검사한다.
`sources.status` 는 기존 UI 호환용 legacy 값(`toLegacySourceStatus`)으로 계속 채운다.

## 4. 환경변수

`.env.local` 에 추가한다. **비밀키에 `NEXT_PUBLIC_` 을 붙이지 않는다.**

```bash
# 필수
GEMINI_API_KEY=
AI_ESTIMATE_ORGANIZATION_ID=       # 처리 대상 sf_organizations.id

# 로컬 파일을 Storage에 신규 등록할 때 필수
AI_ESTIMATE_ACTOR_USER_ID=         # uploaded_by로 기록할 auth.users.id

# 모델 (기본값이 있으므로 생략 가능. 2026-08 기준 실존하는 ID)
GEMINI_EXTRACTION_MODEL=gemini-3.5-flash-lite
GEMINI_RETRY_MODEL=gemini-3.6-flash
GEMINI_EMBEDDING_MODEL=gemini-embedding-001
GEMINI_MARKET_RESEARCH_MODEL=gemini-3.6-flash

# 배치 튜닝
AI_ESTIMATE_BATCH_CONCURRENCY=3      # 1~16, 처음에는 3 이하로 시작
AI_ESTIMATE_MAX_RETRY=3              # 최대 시도 횟수 1~10(최초 호출 포함)
AI_ESTIMATE_CONFIDENCE_THRESHOLD=0.8 # 미달이면 자동 승인하지 않음
AI_ESTIMATE_TOTAL_TOLERANCE=1        # printed/computed 합계 허용 오차(엔)
AI_ESTIMATE_INPUT_USD_PER_MILLION=0.30
AI_ESTIMATE_OUTPUT_USD_PER_MILLION=2.50

# 원본 위치 (둘 중 하나 또는 둘 다)
AI_ESTIMATE_SOURCE_DIR=              # 로컬 스캔 폴더. 미설정이면 Storage 만 스캔
AI_ESTIMATE_STORAGE_BUCKET=ai-estimate-sources
```

기존에 이미 있는 값을 재사용한다: `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`.
(URL 은 공개 값이라 기존 이름을 유지한다. Service Role 은 서버·CLI 에서만 쓴다.)

`dry-run` 은 API 를 호출하지 않으므로 `GEMINI_API_KEY` 없이 동작해야 한다.

## 5. CLI

```bash
npm run ai-estimate:dry-run                      # 파일 변경·API 호출 없이 대상 확인
npm run ai-estimate:smoke   -- --limit 3         # 실제 API 3건
npm run ai-estimate:pilot   -- --limit 100
npm run ai-estimate:ingest  -- --limit 100
npm run ai-estimate:ingest  -- --limit 100 --resume
npm run ai-estimate:retry   -- --limit 100
npm run ai-estimate:retry   -- --source-id <ID>
npm run ai-estimate:reindex -- --limit 100
npm run ai-estimate:report  -- --run-id <ID>

npm run ai-estimate:ingest  -- --all --confirm   # 전체 5,000건. 이 조합 없이는 전체 실행 금지
```

## 6. 로그에 남기지 않는 것

Gemini/Supabase 키, 견적서 원문, 사업자번호, 계좌번호, 연락처, 서명·도장, Gemini 전체 응답.
로그는 `runId / sourceId / status / durationMs / attempt / model / inputTokens / outputTokens` 만 남긴다.
실패 사유는 `last_error_code` + `last_error_class` 코드로만 기록한다.

## 7. 운영 주의사항

- 현재 CLI는 동시 실행 수를 제한한 `generateContent` 배치 실행기다. Gemini의 24시간 비동기
  Batch API가 아니므로 환경변수의 비용 단가는 표준 호출 단가를 사용한다.
- **121 적용 시 `file_hash` 유일 인덱스 생성이 실패하면** 같은 해시의 기존 행이 있다는 뜻이다.
  자동으로 지우지 않으므로 중복을 `excluded` 로 정리한 뒤 다시 적용한다.
- **pgvector 는 `extensions` 스키마에 설치된다.** `<=>` 연산자가 기본 search_path 밖이라
  일반 쿼리에서는 `operator does not exist` 가 난다. 벡터 검색은 반드시
  `ai_estimate_search_chunks` RPC 로 한다.
- 임베딩은 `output_dimensionality=1536` 으로 잘라 저장하고 **반드시 재정규화**한다
  (gemini-embedding 기본 3072 차원은 pgvector 인덱스 상한 2000 을 넘는다).
- `npm ci` 가 깨지지 않도록 package.json 과 package-lock.json 을 항상 함께 커밋한다.
  이 저장소는 `.npmrc` 에 `legacy-peer-deps=true` 가 있다.

### 마이그레이션 적용 전 확인

```sql
select organization_id, file_hash, count(*)
from public.ai_estimate_sources
where file_hash is not null and status <> 'excluded'
group by organization_id, file_hash
having count(*) > 1;
```

결과가 있으면 자동 삭제하지 않는다. 대표 원본을 정한 다음 나머지를 `excluded`로 변경하고
121을 적용한다. 코드 배포는 121 적용 이후에 한다.

## 8. 진행 상황

- [x] 1단계 기존 코드 조사
- [x] 2단계 타입·스키마·상태 모델 (`lib/salesflow/ai/estimates/batch/`)
- [x] 3단계-a 마이그레이션 `121_salesflow_ai_estimate_batch.sql` 작성 및 정적 검토
- [x] 3단계-b Repository (source / extraction / job / statistics)
- [x] 4단계 Gemini Provider (`@google/genai`, 구조화 출력, 모델 라우팅, 호출별 비용 기록)
- [x] 5단계 검증·정규화 (금액·날짜·단위, 검수 필요 조건)
- [x] 6단계 CLI Runner
- [x] 7단계 인덱싱 (승인 데이터만, 가격통계·임베딩)
- [x] 8단계 Node test·문서·장애 복구 절차
- [ ] 실제 raon-flow Supabase 중복 사전 조회 및 121 적용
- [ ] 실제 Gemini 3건 smoke test
- [ ] 대표 문서 50~100건 pilot
