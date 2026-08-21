# Gmail Inbox Integration

SalesFlow 수신함(`/{lang}/inbox`)은 Gmail API OAuth로 연동된 계정의 INBOX 메일을 `inbox_messages`에 동기화합니다.

## Google Cloud 설정

1. [Google Cloud Console](https://console.cloud.google.com/)에서 프로젝트 선택
2. **APIs & Services → Library** → **Gmail API** 활성화
3. **OAuth consent screen** (External)
   - 개발 중: Test users에 연동할 Gmail 계정 추가
   - 프로덕션 공개 전: `gmail.readonly` 민감 scope **검수 제출** 필요
4. **Credentials → Create OAuth client ID → Web application**
   - Authorized redirect URIs:
     - `https://sales.pipeflow.jp/api/gmail/callback`
     - `http://localhost:3000/api/gmail/callback`

Scope: `https://www.googleapis.com/auth/gmail.readonly`

> Supabase Auth용 Google OAuth Client와 **별도** Client ID/Secret을 사용하세요.

## 환경 변수

| 변수 | 설명 |
|------|------|
| `GOOGLE_GMAIL_CLIENT_ID` | Gmail OAuth Web client ID |
| `GOOGLE_GMAIL_CLIENT_SECRET` | Gmail OAuth client secret |
| `GMAIL_TOKEN_ENCRYPTION_KEY` | refresh/access token AES-256-GCM 키 (32 bytes, base64) |
| `CRON_SECRET` | `/api/cron/gmail-sync` Bearer 토큰 |
| `NEXT_PUBLIC_SITE_URL` | OAuth redirect 및 cron sync origin (예: `https://sales.pipeflow.jp`) |
| `SUPABASE_SERVICE_ROLE_KEY` | inbox insert 및 connection upsert (서버 전용) |

### 암호화 키 생성

```bash
openssl rand -base64 32
```

출력값을 `GMAIL_TOKEN_ENCRYPTION_KEY`에 설정합니다.

## 동작

1. **연동**: 수신함 → 「Gmail 연동」→ Google OAuth → `gmail_connections` 저장 → 초기 sync
2. **주기 sync**: Vercel Cron 10분마다 `GET /api/cron/gmail-sync` (Header: `Authorization: Bearer $CRON_SECRET`)
3. **수동 sync**: 연동 배너의 「지금 동기화」
4. **읽음**: 상세 페이지 열람 시 `read_at` 설정; 목록에서 「모두 읽음」
5. **첨부**: 상세에서 `/api/gmail/attachments?inboxMessageId=...&attachmentId=...` 다운로드

## DB

- `gmail_connections`: org당 1연결 (MVP)
- `inbox_messages.payload`: `{ source: "gmail", gmailMessageId, from, attachments }`
- 중복 방지: partial unique index on `(organization_id, payload->>'gmailMessageId')`

마이그레이션: `supabase/migrations/0018_gmail_connections.sql`

## 로컬 테스트

1. `.env.local`에 위 변수 설정
2. GCP OAuth client에 `http://localhost:3000/api/gmail/callback` 등록
3. Test user로 Gmail 연동
4. Cron 수동 호출:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/gmail-sync
```

## 제한 (MVP)

- org당 Gmail 계정 1개
- 최근 30일 INBOX (초기 sync), 이후 historyId 기반 증분
- PDF 자동 분류 / AI 등록 없음
- Gmail Push (Pub/Sub) 없음 — polling only
