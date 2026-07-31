# API 명세

Ringle AI 튜터 백엔드(Rails) API 명세입니다. 모든 경로는 `/api/v1`로 시작합니다.

## 공통 사항

**인증**: 세션 쿠키(`_ringle_recruting_session`, httponly) 기반입니다. `POST /api/v1/session`
로그인 성공 시 쿠키가 발급되고, 이후 요청은 브라우저가 자동으로 쿠키를 포함합니다.
별도 헤더(Authorization 등)는 사용하지 않습니다.

**공통 Request Header**

| 헤더 | 값 | 비고 |
|---|---|---|
| `Content-Type` | `application/json` | Body가 있는 요청(POST 등)에 필요 |
| `Cookie` | `_ringle_recruting_session=...` | 로그인 후 브라우저가 자동 첨부 |

**공통 에러 응답 형식** — 모든 에러 응답은 아래 형태로 통일:

```json
{
  "code": "ERROR_CODE",
  "message": "사람이 읽을 수 있는 에러 메시지"
}
```

`ActiveRecord::RecordNotFound`/`RecordInvalid`에서 비롯된 404/422는
`app/controllers/concerns/error_handling.rb`가 공통 처리하며, 그 외 도메인
에러는 각 서비스 객체의 커스텀 예외(`XxxError::CODE`)로 code가 정해집니다.

---

## POST /api/v1/session — 로그인

**Method**: `POST`
**URL**: `/api/v1/session`
**Request Headers**: 없음 (비로그인 상태에서 호출)
**Path Parameters**: 없음
**Query Parameters**: 없음

**Request Body**

```json
{
  "login_id": "string",
  "password": "string"
}
```

**Success Response** — `200 OK`

```json
{
  "member": {
    "id": 1,
    "login_id": "ringle_user",
    "username": "김링글"
  }
}
```

응답 헤더에 `Set-Cookie: _ringle_recruting_session=...; httponly; samesite=lax`가
포함됩니다. `password`/`password_digest`는 응답에 절대 포함하지 않습니다.

**Error Response**

| HTTP 상태 코드 | Error Code | 상황 |
|---|---|---|
| `401 Unauthorized` | `INVALID_CREDENTIALS` | `login_id`가 없거나 비밀번호 불일치 |

구현: `Api::V1::SessionsController#create` → `Auth::Login`

---

## DELETE /api/v1/session — 로그아웃

**Method**: `DELETE`
**URL**: `/api/v1/session`
**Request Headers**: 없음 (로그인 안 된 상태에서 호출해도 안전)
**Path/Query Parameters**: 없음
**Request Body**: 없음

**Success Response** — `204 No Content` (세션 쿠키 만료 처리)

**Error Response**: 없음

구현: `Api::V1::SessionsController#destroy`

---

## GET /api/v1/members/:id — 회원 상세 조회

현재 보유 멤버십(`member_membership` + `membership`)까지 eager loading으로
포함해서 반환합니다(N+1 없음).

**Method**: `GET`
**URL**: `/api/v1/members/:id`
**Request Headers**: 로그인 세션 쿠키 필요
**Path Parameters**: `id` (integer) — 회원 id
**Query Parameters**: 없음
**Request Body**: 없음

**인가**: `role: admin`이거나, 세션의 로그인 회원 id가 `:id`와 같아야 함
(`ApplicationController#require_admin_or_self!`).

**Success Response** — `200 OK`

```json
{
  "id": 16,
  "login_id": "ringle_user",
  "username": "김링글",
  "role": "user",
  "membership": {
    "membership": {
      "id": 7,
      "name": "프리미엄",
      "permissions": ["study", "converse", "analyze"],
      "duration_days": 60,
      "price": 219000
    },
    "created_at": "2026-07-30T02:11:04.512Z",
    "expires_at": "2026-08-29T06:03:49.402Z",
    "active": true
  }
}
```

멤버십이 없으면 `"membership": null`.

**Error Response**

| HTTP 상태 코드 | Error Code | 상황 |
|---|---|---|
| `403 Forbidden` | `FORBIDDEN` | 로그인 안 함, 또는 admin도 본인도 아님 |
| `404 Not Found` | `MEMBER_NOT_FOUND` | 해당 id의 (soft-delete 안 된) 회원이 없음 |

구현: `Api::V1::MembersController#show` → `Members::Find`

---

## GET /api/v1/memberships — 멤버십 플랜 목록

멤버십 "플랜 카탈로그"를 조회합니다. 특정 회원이 무엇을 보유하고 있는지는
다루지 않습니다(그건 `GET /api/v1/members/:id`의 `membership` 필드를 참고하세요).

**Method**: `GET`
**URL**: `/api/v1/memberships`
**Request Headers**: 불필요 (공개)
**Path/Query Parameters**: 없음

**Success Response** — `200 OK`

```json
[
  {
    "id": 7,
    "name": "프리미엄",
    "permissions": ["study", "converse", "analyze"],
    "duration_days": 60,
    "price": 219000
  }
]
```

`permissions`는 `study`/`converse`/`analyze` 중 이 플랜이 부여하는 권한 이름
배열입니다(`permissions`/`membership_permissions` 테이블 기반, 새 권한 추가 시
코드 변경 없이 row 추가만 하면 됩니다).

**Error Response**: 없음

구현: `Api::V1::MembershipsController#index` → `Memberships::List`

---

## GET /api/v1/memberships/:id — 멤버십 플랜 단건 조회

**Method**: `GET`
**URL**: `/api/v1/memberships/:id`
**Request Headers**: 불필요
**Path Parameters**: `id` (integer)

**Success Response** — `200 OK`: 위 목록의 원소 하나와 동일한 형태.

**Error Response**

| HTTP 상태 코드 | Error Code | 상황 |
|---|---|---|
| `404 Not Found` | `MEMBERSHIP_NOT_FOUND` | 해당 id의 멤버십 플랜이 없음 |

구현: `Api::V1::MembershipsController#show` → `Memberships::Find`

---

## GET /api/v1/admin/members — 회원 목록 (어드민)

어드민 멤버십 할당 화면에서 회원 목록 + 각 회원의 현재 보유 멤버십을 한 번에
보여주기 위한 용도입니다. `GET /api/v1/members/:id`와 동일한 회원 표현(`membership`
포함)을 배열로 반환합니다(eager loading으로 N+1 없음).

**Method**: `GET`
**URL**: `/api/v1/admin/members`
**Request Headers**: 로그인 세션 쿠키 필요
**Path/Query Parameters**: 없음
**Request Body**: 없음

**인가**: `role: admin` (`Api::V1::Admin::BaseController#require_admin!`).

**Success Response** — `200 OK`

```json
[
  {
    "id": 16,
    "login_id": "ringle_user",
    "username": "김링글",
    "role": "user",
    "membership": {
      "membership": {
        "id": 7,
        "name": "프리미엄",
        "permissions": ["study", "converse", "analyze"],
        "duration_days": 60,
        "price": 219000
      },
      "created_at": "2026-07-30T02:11:04.512Z",
      "expires_at": "2026-08-29T06:03:49.402Z",
      "active": true
    }
  }
]
```

id 오름차순으로 반환하며, soft-delete된 회원은 제외됩니다. 멤버십이 없으면 `"membership": null`입니다.

**Error Response**

| HTTP 상태 코드 | Error Code | 상황 |
|---|---|---|
| `403 Forbidden` | `FORBIDDEN` | 로그인 안 함, 또는 admin이 아님 |

구현: `Api::V1::Admin::MembersController#index` → `Members::List`

---

## POST /api/v1/admin/members/:member_id/membership — 멤버십 부여 (어드민)

회원 1명이 보유하는 멤버십은 항상 최대 1건입니다. 이미 활성 멤버십이 있고
**같은 플랜**을 재부여/재구매하면 **연장**(기존 `expires_at` + `duration_days`)하고,
활성 멤버십이 없거나 만료됐으면 지금부터 새로 시작합니다. 활성 멤버십이 있는데
**다른 플랜**으로 바뀌는 경우엔 연장하지 않고 오늘 날짜부터 새 플랜으로
덮어씁니다 — 안 그러면 예를 들어 베이직의 남은 기간이 프리미엄 보너스
일수로 그대로 넘어가버려 의도치 않은 업그레이드가 됩니다(요구사항엔 명시돼
있지 않아 가정, 2026-07-31 결정). 로직은 `Memberships::Grant`(`MemberMembership#grant!`)에
있고 유저 결제 API와 공유합니다.

**Method**: `POST`
**URL**: `/api/v1/admin/members/:member_id/membership`
**Request Headers**: 로그인 세션 쿠키 필요
**Path Parameters**: `member_id` (integer)
**Query Parameters**: 없음

**인가**: `role: admin`만 (`Api::V1::Admin::BaseController#require_admin!`).

**Request Body**

```json
{ "membership_id": 7 }
```

**동작**: `member_memberships` upsert(같은 플랜이면 연장, 다른 플랜이면 오늘부터
새로 시작하는 정책) + `purchase_histories`에
`source: admin, state: completed, price_at_purchase: 0`으로 기록합니다. 이 upsert는
하나의 DB 트랜잭션으로 묶여 있고, 동시에 같은 회원에게 두 번 부여/구매
요청이 들어와 unique 제약을 건드리면 한 번 자동 재시도합니다.

**Success Response** — `200 OK`

```json
{
  "membership": {
    "id": 7,
    "name": "프리미엄",
    "permissions": ["study", "converse", "analyze"],
    "duration_days": 60,
    "price": 219000
  },
  "created_at": "2026-07-30T02:11:04.512Z",
  "expires_at": "2026-08-29T06:03:49.402Z",
  "active": true
}
```

**Error Response**

| HTTP 상태 코드 | Error Code | 상황 |
|---|---|---|
| `403 Forbidden` | `FORBIDDEN` | 로그인 안 함, 또는 admin이 아님 |
| `404 Not Found` | `MEMBER_NOT_FOUND` / `MEMBERSHIP_NOT_FOUND` | `member_id` 또는 `membership_id`가 없음 |
| `422 Unprocessable Content` | `VALIDATION_ERROR` | 저장 검증 실패 |

구현: `Api::V1::Admin::MemberMembershipsController#grant` → `Memberships::Grant`

---

## DELETE /api/v1/admin/members/:member_id/membership — 멤버십 회수 (어드민)

**Method**: `DELETE`
**URL**: `/api/v1/admin/members/:member_id/membership`
**Request Headers**: 로그인 세션 쿠키 필요
**Path Parameters**: `member_id` (integer)

**인가**: `role: admin`만.

**동작**: `member_memberships` row 삭제 + `purchase_histories`에
`source: cancel, state: completed, price_at_purchase: 회수 당시 멤버십 가격`
으로 기록합니다(하나의 트랜잭션).

**Success Response** — `204 No Content`

**Error Response**

| HTTP 상태 코드 | Error Code | 상황 |
|---|---|---|
| `403 Forbidden` | `FORBIDDEN` | 로그인 안 함, 또는 admin이 아님 |
| `404 Not Found` | `MEMBER_NOT_FOUND` | `member_id` 회원이 없음 |
| `422 Unprocessable Content` | `NO_ACTIVE_MEMBERSHIP` | 보유 중인 멤버십이 없음 |

구현: `Api::V1::Admin::MemberMembershipsController#revoke` → `Memberships::Revoke`

---

## POST /api/v1/payments — 유저 결제

결제 대상 회원은 항상 세션의 로그인 회원으로 결정합니다 — 클라이언트가 보낸
값은 신뢰하지 않습니다.

**Method**: `POST`
**URL**: `/api/v1/payments`
**Request Headers**: 로그인 세션 쿠키 필요
**Path/Query Parameters**: 없음

**인가**: 로그인 필요 (`require_member!`).

**Request Body**

```json
{ "membership_id": 8 }
```

**동작** (`Payments::Create`)

1. **order**: `purchase_histories`에 `source: purchase, state: pending,
   price_at_purchase: membership.price`로 주문 레코드를 먼저 생성
2. `MockPaymentGatewayClient`로 mock PG 호출 (요구사항상 실제 PG 연동 제외,
   항상 성공 응답)
3. **complete**: 성공이면 그 pending row를 `Memberships::Grant`에 넘겨서 —
   새 row를 만들지 않고 `state: completed`로 갱신하며 멤버십 부여(위
   admin 부여 API와 같은 정책: 같은 플랜이면 연장, 다른 플랜이면 오늘부터
   새로 시작). 실패면 `state: failed`로 갱신하고 에러 발생

이 API 자체는 플랜 전환(다른 플랜으로 바뀌는 것)을 막지 않습니다 — 프론트
(`MembershipPurchasePage`)가 요청을 보내기 전에 "이미 다른 플랜의 활성
멤버십이 있으면 전환 시 남은 기간이 사라진다"는 확인 팝업을 띄우고,
유저가 계속하기를 선택해야 이 API를 호출합니다.

**Success Response** — `200 OK`: 어드민 부여와 동일한 `member_membership` 형태.

**Error Response**

| HTTP 상태 코드 | Error Code | 상황 |
|---|---|---|
| `401 Unauthorized` | `UNAUTHORIZED` | 로그인 안 함 |
| `404 Not Found` | `MEMBERSHIP_NOT_FOUND` | `membership_id`가 없음 |
| `402 Payment Required` | `PAYMENT_FAILED` | mock PG가 실패를 반환한 경우 (현재는 항상 성공이라 실제로는 발생 안 함) |

구현: `Api::V1::PaymentsController#create` → `Payments::Create`

---

## POST /api/v1/realtime_sessions — AI 대화 세션(ephemeral 토큰) 발급

AI 대화(음성) 기능을 위한 OpenAI Realtime API 연동입니다. 백엔드는 진짜 API 키로
단기(1분) client secret만 발급하고, 프론트는 그 secret으로 OpenAI에 WebRTC로
직접 연결합니다(지연 시간 최소화, 진짜 키는 프론트에 절대 노출되지 않습니다).
발급 즉시 같은 요청 흐름 안에서 바로 handshake에 쓰이기 때문에(보통 1초
안쪽) 1분이면 충분하고, 토큰이 새는 비정상 상황에서의 노출 시간도 최소화됩니다.

**Method**: `POST`
**URL**: `/api/v1/realtime_sessions`
**Request Headers**: 로그인 세션 쿠키 필요
**Path/Query Parameters**: 없음

**Request Body**

```json
{ "voice": "marin" }
```

`voice`는 선택 항목입니다. 생략하면 기본값(`alloy`)을 사용합니다. 지정하면
`OpenaiRealtimeGatewayClient::ALLOWED_VOICES`(`alloy`, `ash`, `ballad`,
`coral`, `echo`, `sage`, `shimmer`, `verse`, `marin`, `cedar`) 중 하나여야
합니다 — gpt-realtime 모델이 실제로 지원하는 voice 목록으로, 일반 TTS
엔드포인트가 지원하는 목록(`fable`/`nova`/`onyx` 포함)과는 다릅니다.

**인가**: 로그인 + **활성 멤버십의 `converse` 권한 필요**
(`require_membership_permission!`). "멤버십 만료/권한 없으면 사용 불가"
요구사항을 실제로 강제하는 지점입니다. AI와 실시간으로 음성 대화하는 기능
자체가 "대화" 권한 영역이라 `converse`로 게이트했습니다 — 베이직(학습만)
멤버십은 대화 화면에 진입할 수 없고, 프리미엄(학습+대화+분석)만
가능합니다(2026-07-31 결정, 잠깐 `study`로 바꿨다가 다시 `converse`로
되돌림).

**동작**: `OpenaiRealtimeGatewayClient`가 `POST
https://api.openai.com/v1/realtime/client_secrets`를 서버 대 서버로 호출합니다.

**Success Response** — `200 OK`

```json
{
  "client_secret": "ek_...",
  "expires_at": "2026-07-30T07:10:00.000Z"
}
```

**Error Response**

| HTTP 상태 코드 | Error Code | 상황 |
|---|---|---|
| `401 Unauthorized` | `UNAUTHORIZED` | 로그인 안 함 |
| `403 Forbidden` | `MEMBERSHIP_PERMISSION_REQUIRED` | 활성 멤버십이 없거나 `converse` 권한이 없는 플랜 |
| `422 Unprocessable Content` | `INVALID_VOICE` | `voice`가 허용 목록에 없음 |
| `502 Bad Gateway` | `PROVIDER_ERROR` | OpenAI 호출 실패 (`Rails.application.credentials.openai_api_key` 미설정 포함) |

**설정 필요**: `bin/rails credentials:edit`로 본인 OpenAI API 키를
`openai_api_key: sk-...`로 추가해야 실제 발급이 동작합니다(개인 계정 키 사용,
별도 제공 키 없음).

구현: `Api::V1::RealtimeSessionsController#create` → `RealtimeSessions::Create`
→ `OpenaiRealtimeGatewayClient`

---

## POST /api/v1/translations — 텍스트 번역 (영→한)

학습 대화 화면에서 유저 발화/AI 응답 텍스트를 한국어 번역과 함께 보여주기
위한 용도입니다. Realtime API(WebRTC) 세션과 무관하게 독립적으로 동작하는
일반 텍스트 API 호출이며, OpenAI Chat Completions(`gpt-4o-mini`)로 서버 대
서버 호출합니다.

**Method**: `POST`
**URL**: `/api/v1/translations`
**Request Headers**: 로그인 세션 쿠키 필요
**Path/Query Parameters**: 없음

**Request Body**

```json
{ "text": "Nice to meet you." }
```

`text`는 비어있으면 안 되고 최대 2,000자까지입니다(`Translations::Create::
MAX_TEXT_LENGTH`) — 한 대화 턴 분량을 넉넉히 잡은 상한이며, 과도한 요청으로
인한 비용 낭비를 막기 위한 최소한의 검증입니다.

**인가**: 로그인 + **활성 멤버십의 `converse` 권한 필요** (`realtime_sessions`와
동일한 기준입니다 — 대화 화면에서만 쓰이는 부가 기능이기 때문입니다).

**Success Response** — `200 OK`

```json
{ "translation": "만나서 반가워요." }
```

**Error Response**

| HTTP 상태 코드 | Error Code | 상황 |
|---|---|---|
| `401 Unauthorized` | `UNAUTHORIZED` | 로그인 안 함 |
| `403 Forbidden` | `MEMBERSHIP_PERMISSION_REQUIRED` | 활성 멤버십이 없거나 `converse` 권한이 없는 플랜 |
| `422 Unprocessable Content` | `BLANK_TEXT` | `text`가 비어있거나 공백뿐임 |
| `422 Unprocessable Content` | `TEXT_TOO_LONG` | `text`가 2,000자 초과 |
| `502 Bad Gateway` | `PROVIDER_ERROR` | OpenAI 호출 실패 (`openai_api_key` 미설정 포함) |

구현: `Api::V1::TranslationsController#create` → `Translations::Create` →
`OpenaiTranslationGatewayClient`

---

## GET /api/v1/topics — 학습 주제 목록

**Method**: `GET`
**URL**: `/api/v1/topics`
**Request Headers**: 불필요 (공개, `memberships`와 동일한 원칙)

**Success Response** — `200 OK`

```json
[
  { "id": 6, "title": "자기소개하기", "title_en": "Introducing One's Name and Role at Work" },
  { "id": 7, "title": "비즈니스 미팅", "title_en": "Leading a Business Meeting" }
]
```

제목(한/영)만 반환하는 가벼운 응답입니다 — 문단 본문(언어별 content)은 상세 조회에서만 내려줍니다.
`title_en`은 목록 카드에 영어 부제로 보여주기 위한 용도입니다. soft-delete된 주제는 목록에서 제외됩니다.

**Error Response**: 없음

구현: `Api::V1::TopicsController#index` → `Topics::List`

---

## GET /api/v1/topics/:id — 학습 주제 상세

**Method**: `GET`
**URL**: `/api/v1/topics/:id`
**Request Headers**: 불필요
**Path Parameters**: `id` (integer)

**Success Response** — `200 OK`

```json
{
  "id": 6,
  "title": "자기소개하기",
  "title_en": "Introducing One's Name and Role at Work",
  "paragraphs": [
    {
      "id": 1,
      "position": 0,
      "translations": {
        "ko": "새로운 사람을 만나는 비즈니스 환경에서 본인을 소개해보세요.",
        "eng": "Introduce yourself in a business setting where you meet someone new."
      }
    },
    {
      "id": 2,
      "position": 1,
      "translations": {
        "ko": "이름, 소속, 담당 업무를 순서대로 말하는 연습을 해보세요.",
        "eng": "Practice saying your name, affiliation, and role in that order."
      }
    }
  ]
}
```

하나의 토픽은 순서(`position`) 있는 여러 문단(`paragraphs`)으로 구성되며, 문단마다
언어별 `translations`를 가집니다. 번역이 일부 언어만 있으면 그 언어만
`translations`에 키로 포함됩니다. `title_en`은 토픽 소개(인트로) 화면의 영문
부제로 쓰이는 짧은 제목형 필드로, 문단 번역(`paragraphs[].translations`)과는
별개입니다.

**Error Response**

| HTTP 상태 코드 | Error Code | 상황 |
|---|---|---|
| `404 Not Found` | `TOPIC_NOT_FOUND` | 해당 id의 주제가 없거나 soft-delete된 경우 |

구현: `Api::V1::TopicsController#show` → `Topics::Find`

---

## GET /api/v1/health, GET /up — 헬스체크

**Method**: `GET`
**URL**: `/api/v1/health` (애플리케이션 레벨), `/up` (Rails 기본, 로드밸런서용)
**인증**: 불필요
**Success Response**: `200 OK`, `/api/v1/health`는 `{ "status": "ok", "timestamp": "..." }`
**Error Response**: 없음
