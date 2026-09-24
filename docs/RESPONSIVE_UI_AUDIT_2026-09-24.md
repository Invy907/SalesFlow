# 반응형 UI 감사 및 수정 기록

점검일: 2026-09-24

## 범위와 현재 상태

SalesFlow의 모바일·태블릿·PC 화면을 정적 코드 검토와 실제 Chrome의 뷰포트 변경으로 점검했다. 대상 너비는 **320, 390, 768, 1024, 1440 CSS px**다. 긴 거래처명·품목명·제목·메모·이메일·큰 금액과 한국어·일본어·영어 표시를 포함했다. 이 문서는 [Misoca 비교 점검](MISOCA_AUDIT_2026-09-22.md) 이후의 반응형 작업을 기록한다. AI 기능의 처리·권한·외부 연동 계약은 [AI 견적 RAG 문서](AI_ESTIMATE_RAG.md)를 참조한다.

수정은 현재 작업 트리에 반영했다. **62개 페이지 × 5개 너비, 총 310개 기본 조합**에서 대상 화면을 확인했으며, 수정 후 문서 전체 가로 넘침은 0이었다. 최신 코드의 테스트 163개, 전체 린트·타입 검사와 프로덕션 빌드도 통과했다. **운영 배포, 운영 DB 적용, 실제 모바일 기기 검증을 완료했다는 의미는 아니다.** 추가 동작의 확인 범위와 미완료 항목은 아래에 구분했다.

페이지 파일 기준 경로는 62종이다. 이 수에는 API, 레이아웃, 로딩·오류 컴포넌트, 검색 쿼리별 상태는 포함하지 않는다. `/{lang}`은 `ko`, `ja`, `en` 중 하나이며, 언어별 URL을 각각 다른 화면 유형으로 중복 집계하지 않았다. 동적 경로는 합성 QA 데이터의 실제 ID로 열어 확인한다. 유효한 공유 토큰이 필요한 공유 화면 2종은 초기 순회에서 제외했지만, 이후 실제 토큰으로 5개 너비를 확인하여 최종 310개 조합에 포함했다.

## 수정 기준

- 화면 전체의 불필요한 가로 스크롤을 없앤다. 여러 열이 필요한 문서·명세·통계 표는 표 영역 안에서 가로 스크롤하도록 유지한다.
- 긴 이름·제목·주소·메모는 필요한 위치에서 줄바꿈한다. 표 안의 금액과 날짜는 읽을 수 있게 유지하며, 작은 카드에서는 금액 영역을 다음 행으로 배치한다.
- 모바일에서 여러 버튼·필터·필수 표시가 겹치지 않도록 줄바꿈과 폭을 조정한다. 큰 빈 영역 때문에 다음 작업이 화면 아래로 밀리지 않게 한다.
- 모달·팝업·모바일 메뉴는 화면 높이, 화면 가장자리, 포커스, Escape, 닫은 뒤 스크롤 복구를 함께 고려한다.
- 가로 넘침 수치만으로 읽기 쉬움을 판정하지 않는다. 대상 페이지의 제목과 실제 콘텐츠, 버튼 접근, 표 스크롤, 긴 텍스트와 금액을 함께 확인한다.

## 영역별 변경

| 영역 | 확인한 문제와 반영 내용 | 주요 코드 |
| --- | --- | --- |
| 공통 셸·탭·검색 | 모바일 내비게이션과 프로필 메뉴의 화면 경계·스크롤, 좁은 탭과 검색 영역의 최소 폭을 보정했다. | `salesflow-shell.tsx`, `page-container.tsx`, `list-page-shared.tsx`, `globals.css` |
| 모달·달력 | 공통 모달의 동적 화면 높이와 내부 스크롤을 적용했다. 날짜·연월 팝업의 화면 가장자리 배치와 크기 변경 처리를 보완했다. | `modal-dialog.tsx`, `list-page-shared.tsx`, `date-field-input.tsx`, `month-field-input.tsx` |
| 견적·청구·납품·영수증 목록 | 긴 번호·거래처명·제목을 제한된 열 폭에서 줄바꿈하고 금액·날짜가 분리되지 않게 했다. 표 스크롤 영역에 키보드 접근을 제공하고, 일괄 작업 도구가 모바일 높이를 과도하게 차지하지 않도록 조정했다. | 문서 4종의 `*-list.tsx` |
| 홈 | 1024px 구간의 KPI를 2열로 유지하고 큰 금액의 글자 크기·줄바꿈을 조정했다. 모바일 할 일과 최근 문서에서 금액·상태를 분리하고 섹션 제목·링크를 줄바꿈한다. | `home-client.tsx` |
| 보고서 | 좁은 필터 영역을 줄바꿈하고 긴 거래처명을 선택해도 폭이 늘어나지 않게 했다. 월별 차트의 최소 폭을 확보하고, 태블릿에서 해제되던 표 가로 스크롤을 유지했다. 설명 아이콘은 클릭·키보드로 열 수 있고 말풍선의 상하 위치를 보정한다. | `reports-main-client.tsx`, `collections-client.tsx`, `receivables-client.tsx`, `reports-shared.tsx` |
| 거래처 | 긴 상세 값·문서명과 등록 모달의 수신자·경칭 배치를 조정했다. 표의 마지막 행에서 잘리던 문서 작성 메뉴를 행 안에서 펼치도록 바꿨다. 상세 정보 라벨은 기존 3언어 문구를 재사용한다. | `clients-table.tsx`, `client-registration-modal.tsx`, `client-detail-client.tsx` |
| 품목·CSV 안내 | 단가 입력과 통화 단위가 좁은 폭에서 충돌하지 않도록 했다. 품목 목록의 긴 이름·단위, 빈 상태와 3언어 열 제목을 보정했다. 거래처·품목 CSV 형식 안내는 모바일에서 세로로 배치한다. | `item-form.tsx`, `items-table.tsx`, `clients/bulk/page.tsx`, `items/bulk/page.tsx` |
| 주문·주문폼 | 주문 목록의 모바일 높이를 제한해 선택한 상세가 가까이 표시되도록 했다. 상세 값의 과도한 생략을 제거하고 주문 모달을 공통 모달로 전환했다. 주문폼의 공백 없는 긴 거래처명·품목명·단위에 줄바꿈을 적용했다. | `orders-client.tsx`, `create-order-modal.tsx`, `order-forms-client.tsx`, `new-order-form-client.tsx` |
| 받은 문서·이용 내역 | 긴 제목·이메일·본문·첨부파일명을 줄바꿈하고 토스트를 화면 안으로 제한했다. 목록 제목에 키보드로 접근 가능한 링크를 제공했다. 이용 건수는 큰 숫자에도 폭을 넘지 않게 했다. | `inbox-list.tsx`, `inbox-detail-client.tsx`, `usage/page.tsx` |
| 문서 작성·상세·공유 | 저장 바에 상속되던 큰 하단 여백을 제거하고 합계·저장 및 보조 합계를 작게 구성했다. 영수증 오류 표시를 저장 영역에 통합했다. 청구서 미리보기 분할을 더 넓은 화면에서 적용하고 정기 청구 탭·모달·상세 메뉴, 긴 문서번호·회사명·금액, 표 내부 스크롤을 보정했다. 미리보기 썸네일은 실제 축소 높이를 반영한다. | `new-document-shared.tsx`, 문서별 폼, `sales-document-detail-client.tsx`, `sales-document-preview.tsx`, 공유 페이지 |
| AI 자료·설정·인증·지원 | 긴 제목·경고·근거·설정값과 좁은 카드·입력·버튼 배치를 점검했다. 원본 없는 AI 검수 화면은 빈 큰 원본 영역을 만들지 않도록 구성하고, 인증·지원 화면의 모바일 여백과 다국어 표시를 보완했다. | AI 자료/설정 컴포넌트, `settings-shared.tsx`, 인증·지원 페이지 |

코드 검토에서 확인한 문제와 실제 Chrome에서 재현한 문제를 함께 수정했다. 대표적으로 주문폼의 공백 없는 긴 거래처명은 320px 화면에서 문서 너비를 858~859px까지 늘렸다. 해당 텍스트에 줄바꿈과 올바른 flex 최소 폭을 적용한 뒤, 동일한 320px 화면에서 문서 너비 320px로 재확인했다.

## 페이지 62종 목록

아래 경로에는 공통 접두사 `/{lang}`을 붙인다. `[id]`, `[itemId]`, `[sourceId]`, `[token]`은 실제 값으로 대체한다.

| 분류 | 수 | 경로 |
| --- | ---: | --- |
| 홈 | 1 | `/` |
| 견적 | 6 | `/estimates`<br>`/estimates/new`<br>`/estimates/[id]`<br>`/estimates/[id]/edit`<br>`/estimates/[id]/fax`<br>`/estimates/shared/[token]` |
| AI 자료 | 3 | `/estimates/ai-library`<br>`/estimates/ai-library/upload`<br>`/estimates/ai-library/[sourceId]` |
| 청구서 | 6 | `/invoices`<br>`/invoices/new`<br>`/invoices/[id]`<br>`/invoices/[id]/edit`<br>`/invoices/csv_upload`<br>`/invoices/shared/[token]` |
| 정기 청구 | 3 | `/invoices/periodic`<br>`/invoices/periodic/new`<br>`/invoices/periodic/[id]/edit` |
| 납품서 | 4 | `/delivery-notes`<br>`/delivery-notes/new`<br>`/delivery-notes/[id]`<br>`/delivery-notes/[id]/edit` |
| 영수증 | 4 | `/receipts`<br>`/receipts/new`<br>`/receipts/[id]`<br>`/receipts/[id]/edit` |
| 거래처 | 3 | `/clients`<br>`/clients/bulk`<br>`/clients/[id]` |
| 품목 | 4 | `/items`<br>`/items/new`<br>`/items/bulk`<br>`/items/[itemId]/edit` |
| 주문 | 3 | `/orders`<br>`/orders/form`<br>`/orders/form/new` |
| 보고서 | 3 | `/reports`<br>`/reports/receivables`<br>`/reports/collections` |
| 받은 문서 | 2 | `/inbox`<br>`/inbox/[id]` |
| 이용 내역 | 1 | `/usage` |
| 설정 | 10 | `/settings`<br>`/settings/account`<br>`/settings/company`<br>`/settings/document-defaults`<br>`/settings/display`<br>`/settings/payment`<br>`/settings/team`<br>`/settings/ai-estimates`<br>`/settings/evidence`<br>`/settings/other` |
| 지원 | 5 | `/support`<br>`/support/invoice-guide`<br>`/support/order-form-guide`<br>`/support/announcements`<br>`/support/announcements/[id]` |
| 인증 | 4 | `/auth/sign-in`<br>`/auth/sign-up`<br>`/auth/forgot-password`<br>`/auth/reset-password` |
| **합계** | **62** | 공유 페이지 2종을 포함한 코드상 페이지 종류 수 |

`/clients`의 등록·수정 모달처럼 별도 페이지 파일이 없는 동작은 위 경로 수에 추가하지 않는다. 발행/초안·휴지통·검색 결과·빈 결과·검수 상태·오류 상태도 같은 경로 안에서 별도 시나리오로 확인한다.

## 검증 환경과 합성 데이터

- API: `http://localhost:58321`에 둔 별도 로컬 Supabase 프로젝트. 프로젝트 디렉터리는 `/tmp/salesflow-misoca-qa`, 프로젝트 ID는 `salesflow-misoca-qa`다.
- 앱: 로컬 프로덕션 서버 `http://salesflow-qa.localhost:33100`. 다른 localhost 앱의 인증 상태와 섞이지 않도록 전용 호스트를 사용했다.
- 환경 파일: `/tmp/salesflow-misoca-qa/qa.env.local`. 필요한 로컬 연결값을 사용하며 키 값은 문서나 검사 로그에 기록하지 않는다.
- 데이터 준비: [`scripts/ui/qa-fixtures.ts`](../scripts/ui/qa-fixtures.ts). 합성 사용자·조직·거래처·품목·문서 4종·정기 청구·주문·주문폼·받은 문서·AI 검수 자료를 생성한다. 실제 고객 문서를 사용하지 않는다.
- 동적 ID 기록: `/tmp/salesflow-misoca-qa/responsive-fixtures.json`. 생성 중단 시에도 생성된 계정·조직을 정리할 수 있도록 먼저 기록한다.

합성 데이터에는 공백 없는 영문 이름 반복, 긴 한글 부서명과 메모, 긴 주소·이메일·첨부파일명, 단가 `987,654,321`엔과 수량 10의 거액 명세가 들어 있다. AI 검수용 PDF는 스크립트가 직접 만든 합성 문서이며 외부 AI 호출로 생성한 자료가 아니다. `--add-original`은 원본 PDF와 검수 관계를 추가하고 Storage 업로드·다운로드 바이트 일치를 확인한다.

이 스크립트는 **HTTP localhost/127.0.0.1의 58321 포트만 허용**한다. 초기 생성은 기존 QA 계정을 다시 생성하는 방식이므로 반복 실행이 필요한 경우 먼저 이전 fixture를 정리한다. `--cleanup`은 매니페스트의 QA 조직·사용자·원본 파일을 삭제하므로 다른 데이터에 재사용하지 않는다.

## 재현 명령

저장소 루트에서 실행한다. 아래 환경 파일과 격리 Supabase 프로젝트·마이그레이션은 별도로 준비되어 있어야 한다. 운영 연결값으로 대체하지 않는다. 이미 실행 중인 서버에 동일 포트로 두 번째 서버를 띄우지 않는다.

```bash
npx supabase start --workdir /tmp/salesflow-misoca-qa
npx tsx --env-file=/tmp/salesflow-misoca-qa/qa.env.local scripts/ui/qa-fixtures.ts
```

기존 fixture에 원본 PDF 검수 사례만 보완하려면 다음 명령을 사용한다.

```bash
npx tsx --env-file=/tmp/salesflow-misoca-qa/qa.env.local scripts/ui/qa-fixtures.ts --add-original
```

코드 검사와 동일 QA 환경의 프로덕션 빌드·실행 명령은 다음과 같다. `npm test`는 순수 로직·회귀 테스트이며, 브라우저 반응형 검사를 대신하지 않는다.

```bash
npm test
npm run lint
npx tsc --noEmit
git diff --check
node --env-file=/tmp/salesflow-misoca-qa/qa.env.local node_modules/next/dist/bin/next build
node --env-file=/tmp/salesflow-misoca-qa/qa.env.local node_modules/next/dist/bin/next start --hostname 0.0.0.0 --port 33100
```

페이지 목록은 다음과 같이 다시 확인할 수 있다.

```bash
rg --files src/app | rg '/page\.tsx$' | sort
```

Chrome에서 QA 호스트에 로그인하고 각 대상 URL을 연 뒤 320/390/768/1024/1440px로 변경한다. 인증 페이지는 로그인 상태의 자동 리디렉션을 피하도록 별도 인증 상태에서 확인한다. 먼저 URL과 대상 제목을 확인하고, 오류·로그인 화면으로 이동했거나 데이터 로딩이 실패한 경우 해당 본문 화면의 검사로 집계하지 않는다. 일반 페이지는 실제 `h1`, 공유 페이지는 문서의 `h2`를 확인했다. 비밀번호 재설정 화면은 로딩이 끝난 뒤 실제 `h1`이 표시되는 상태로 재검사했다. 가로 넘침의 기본 수치는 다음과 같이 재현할 수 있다.

이 세션의 화면 검사는 실제 Chrome 제어 도구로 수행했다. 위 셸 명령은 서버와 데이터를 재현하며, 브라우저의 모든 경로·너비 조합을 자동 실행하는 영구적인 E2E 테스트 스크립트는 아니다.

```javascript
({
  url: location.href,
  headings: [...document.querySelectorAll('h1, h2')].map(node => node.textContent?.trim()),
  viewport: window.innerWidth,
  documentWidth: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth),
  horizontalOverflow: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) > window.innerWidth,
})
```

표의 `scrollWidth > clientWidth`는 의도한 지역 스크롤일 수 있다. 이를 문서 전체 가로 넘침과 혼동하지 않는다. 표를 실제로 끝까지 스크롤하고 열·행 동작에 접근할 수 있는지 확인한다. 위 수치가 정상이어도 잘린 내용, 과도한 생략, 버튼 겹침, 잘못된 고정 영역, 읽기 어려운 금액은 별도로 검사한다.

검증을 마친 QA 데이터의 정리 명령은 다음과 같다. 추가 검증이 끝나기 전에 실행하지 않는다.

```bash
npx tsx --env-file=/tmp/salesflow-misoca-qa/qa.env.local scripts/ui/qa-fixtures.ts --cleanup
```

## 검사 결과

| 검사 | 확인 결과 |
| --- | --- |
| 단위·회귀 테스트 | `npm test` **163개 통과**, 실패·취소·건너뜀 0 |
| 린트·타입 | 최신 수정 이후 전체 ESLint, TypeScript 검사 통과. `git diff --check` 통과 |
| 프로덕션 빌드 | 최신 수정이 반영된 Next.js 프로덕션 빌드 통과 |
| 기본 페이지 | **62종 × 5개 너비 = 310개 조합** 완료. 대상 제목을 확인했으며 최종 문서 전체 가로 넘침 0 |
| 320px 구성 | 인증 화면을 제외한 58개: 55개 순회 + 홈 직접 확인 + 공유 2개. 인증 4개까지 합쳐 62개 |
| 나머지 4개 너비 구성 | 인증 화면을 제외한 58개 × 4 = 232개. 인증 4개 × 4 = 16개를 더해 248개 |
| 인증 화면 | 4개 × 5 = 20개. 비밀번호 재설정은 로딩 완료 후 실제 제목으로 재확인 |
| 공유 화면 | 견적·청구서 공유 2종을 5개 너비에서 실제 문서 제목으로 확인. 기본 310개에 포함. 인증 쿠키 없는 HTTP 요청에서도 각각 200과 합성 문서 본문을 확인 |
| 주문폼 회귀 | 320px에서 초기 너비 858~859px의 넘침을 재현했고 수정 후 너비 320px로 확인 |

합계는 `(58 × 4) + 58 + (4 × 5) = 310`이다. 같은 조합의 실패 후 재시도나 수정 후 재검사를 추가 성공 건수로 중복 집계하지 않았다. 이 수치는 기본 페이지 조합이며, 모든 언어·권한·상태 조합의 전수 검증을 의미하지 않는다. 아래 영어·상태별 추가 검사는 기본 310개와 별도로 기록한다.

실행 로그의 임시 보관 위치는 `/tmp/salesflow-misoca-qa/`이며 `responsive-tests.log`, `responsive-lint.log`, `responsive-tsc.log`, `responsive-build.log`, `responsive-final-lint.log`, `responsive-final-build.log`, `responsive-production.log` 등이 있다. 이 경로는 세션 임시 파일이므로 영구적인 CI 결과나 배포 증빙이 아니다.

## 실제로 확인한 추가 동작

좌표는 CSS px 기준 `(left, top, right, bottom)`이다. 단순히 문서 전체 가로 넘침을 측정한 결과와, 버튼·팝업의 개별 동작을 확인한 결과를 구분했다.

| 대상 | 확인한 범위와 결과 |
| --- | --- |
| 원본 PDF가 있는 AI 검수 | 추가 검수 상태를 5개 너비에서 확인했다. UI에서 할인행을 포함한 3개 명세, 긴 라벨, 하단 영역을 확인한 후 승인했고 `Approved` 표시까지 확인했다. |
| 일본어 추가 화면 | 청구서 작성·서식 갤러리 320px에서 썸네일 2열과 긴 문구, 합계·저장 바를 확인했다. 로그인 요청 실패 안내도 320px에서 가로 넘침 없이 표시됐다. |
| 영어 추가 화면 | 보고서 390px의 연월 팝업, 견적 390px의 날짜·서식 선택, 거래처 모달 320/390px, AI 검수 5개 너비를 실제로 확인했다. |
| 거래처 모달 | 영어 320×740 화면의 모달 경계는 `(16, 16, 304, 724)`였다. 390px도 확인했고 Escape로 닫은 뒤 원래 화면으로 복귀했다. |
| 거래처 검색 빈 결과 | 영어 화면에서 `NO_MATCH` 검색 후 `No clients` 빈 결과를 확인했다. 모든 목록의 모든 검색 상태를 검증한 것으로 확대하지 않는다. |
| 모바일 내비게이션 | 최종 네이티브 dialog의 `open=true`, 닫기 버튼의 초기 포커스, Tab 이동이 dialog 내부에 머무는 것을 확인했다. 390→1024px 변경 시 자동으로 닫히며 본문 스크롤의 overflow가 `visible`로 복구됐다. |
| 가로 화면의 프로필·언어 메뉴 | 844×390 화면에서 프로필을 펼친 뒤 언어 목록의 최대 bottom이 365.5px로 화면 높이 390px 안에 들어왔다. |
| 날짜 팝업 | 390×844에서 경계 `(16, 303, 336, 830)`, 844×390에서 `(24, 16, 344, 374)`로 화면 안에 표시됐다. 낮은 높이에서는 팝업 내부 스크롤을 확인했다. |
| 연월 팝업 | 390px 화면에서 right가 374px로 화면 오른쪽 경계 안에 표시됐다. |
| 서식 선택 모달 | 모바일 내부 스크롤로 하단 `Cancel`/`Select` 버튼에 접근했다. 네이티브 dialog 전환 후 일본어 320px에서 미리보기→Escape→갤러리와 썸네일 포커스 복귀, 다시 Escape→전체 닫기·본문 스크롤 복구를 확인했다. 전체 닫기 뒤 포커스가 본문으로 빠지는 문제를 추가 수정했다. |
| 최종 공통 모달 회귀 | QA 인증 지연으로 마지막 포커스 수정은 실제 `src/components/modal-dialog.tsx`를 import한 임시 React 페이지에서 검증했다. 320px Chrome에서 Escape와 닫기 버튼 각각 실행 후 모달 0개, 열었던 버튼에 포커스, 기존 `body overflow=auto` 복원을 확인했다. 제품의 전체 서식 흐름 재검사와는 구분한다. |
| 빈 폼 저장 오류 | QA 서버 지연으로 저장 대기 상태만 관찰했다. 오류 응답·오류 문구 표시·수정 후 재저장 성공은 완료로 기록하지 않는다. |

QA 합성 데이터와 원본 PDF는 `--cleanup`으로 정리했다. 격리 DB에서 조직·사용자·원본 Storage 객체가 각각 0개임을 확인했다. QA 앱 서버와 해당 Supabase 프로젝트를 종료했고, 임시 `.env.local`은 QA 사본과 일치하는지 확인한 뒤 제거해 작업 전 상태로 돌렸다. 다른 프로젝트의 컨테이너는 변경하지 않았다. 최종 모달 검증 페이지는 `/tmp/salesflow-misoca-qa/modal-harness/`의 실제 컴포넌트 import 번들을 사용했고 저장소에 테스트용 페이지를 추가하지 않았다.

## 한계와 분리 기록

이번 검증의 모바일·태블릿은 **Chrome의 뷰포트 변경**이다. iOS Safari, Android 실기기, 가상 키보드 표시, 실제 주소 표시줄 확장·축소, 노치·safe area, 터치 관성과 인쇄 장치 동작을 실기기에서 검증하지 않았다. 화면 너비를 바꿔 확인한 회전 대응과 실제 기기의 회전 이벤트·키보드 동작은 동일한 검증이 아니다.

로컬 Supabase/DB에서 간헐적으로 **504·응답 지연**이 발생했다. 대상 페이지 데이터가 로딩되지 않은 사례는 레이아웃 성공으로 집계하지 않았고, 실제 제목이 표시된 화면으로 재확인했다. 기본 페이지 310개 검사는 완료했지만 빈 폼 저장은 대기 상태만 관찰했으므로 오류 처리 검증은 미완료다. 로컬 DB의 일시적 오류만으로 UI 실패나 운영 성능을 단정하지 않는다.

합성 fixture에 포함한 첨부파일 메타데이터는 긴 파일명 표시를 검증하기 위한 것이다. Gmail 실제 첨부파일 다운로드, OAuth 재연결, 실제 이메일·FAX 발송이나 외부 AI 호출을 이 반응형 감사로 검증했다고 주장하지 않는다. 파일 선택기·실제 PDF 렌더·공유 토큰·비동기 처리 등 별도 실행 조건이 필요한 기능은 해당 시나리오의 결과를 따로 기록한다.

62개 페이지 경로를 확인하더라도 모든 권한·오류·네트워크·데이터량·브라우저 조합을 전수 검증한 것은 아니다. 이번 수정의 완료 기준은 확인한 화면 배치 문제를 수정하고, 범위가 명시된 검사에서 회귀를 확인하는 것이다.
