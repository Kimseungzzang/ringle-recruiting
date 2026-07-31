# 프로젝트 개요

링글(Ringle) 채용 과제: **AI 튜터 풀스택 구현과제**. LLM API 기반 대화형 영어 학습
앱을 구현한다. 멤버십을 구매/보유한 사용자가 AI와 음성으로 대화할 수 있는, 실제
서비스 수준으로 동작하는 앱을 만드는 것이 목표. AI 기반 개발 툴(Claude Code) 사용
능력 자체가 평가 요소이므로, 개발 과정과 산출물 요구사항을 반드시 지킨다.

**기술 스택은 고정**: Backend = Ruby on Rails, Client(Web) = TypeScript + React.
원문 PDF는 `/Users/ksjhbrc/development-personal/requirements.pdf` (프로젝트 밖,
상위 디렉토리에 위치).

---

## 1. 멤버십 관리 (Backend)

- 멤버십은 **이용 기한**이 있는 사용권. 기한 만료 시 사용 불가 처리해야 함.
- 멤버십 종류는 아래 세 가지 기능 권한의 **조합**으로 정의:
  - `학습`: 학습 자료를 따라 AI와 학습
  - `대화`: AI와 자유 대화
  - `분석`: AI와 나눈 대화 기반 레벨 분석
  - 예: 베이직 = 학습만, 30일 / 프리미엄 = 학습+대화+분석, 60일
- 멤버십 할당 방식 두 가지, 각각 API + (어드민 쪽은) UI 필요:
  - **어드민 멤버십 부여 API**: 어드민이 유저에게 멤버십을 부여/삭제. 이를 사용하는
    어드민 UI 필요.
  - **유저 결제 API**: 유저가 결제해서 멤버십 획득. 결제 정보는 유효하다고 가정,
    PG사 결제는 **mock object 호출**로 대체 (실제 PG 연동 제외).
- **제외 요구사항**: 실제 PG사 결제 API 연동, 인증(로그인/인가) 로직.

## 2. AI 대화 진행 & 멤버십 현황 조회 (Client - Web)

- 홈 화면: 보유 멤버십 확인 + (구매 기능 구현 시) 구매 가능.
- 대화 화면 진입 전 멤버십 보유 여부 판단(없으면 진입 불가 등 처리).
- 대화 화면 진입 시 **AI가 먼저** 대화를 시작.
- 마이크 버튼으로 오디오 인식 시작, 말하는 동안 waveform 등 **인식 중임을 보여주는
  UX** 필요.
- "답변완료" 버튼 → 유저 발화를 텍스트로 변환 → AI 응답 생성.
- **LLM, STT, TTS는 반드시 실제 연동** (mock 금지 — 결제 API만 mock 허용). 유저
  관점 완성도가 최우선 평가 기준.
- 네트워크 오류 등 예외 상황에 대비한 설계.
- 유저/AI가 말한 오디오를 재생 버튼으로 다시 들을 수 있어야 함.
- 전체 오디오를 그대로 넘기지 말고 **VAD(Voice Activity Detection)**로 공백 제거
  후 STT 요청.
- 프롬프트로 AI가 일관된 주제를 유지하며 대화하도록 설계.
- 응답 지연 시간 단축을 위한 기술/UX 방법 적용 (예: Streaming, Real-time STT).
- 마이크를 열어둔 채 과도한 요청을 보내는 등 **오남용 방지** 조치 필요.
- **제외 요구사항**: 대화 기록의 서버 영속화 (클라이언트 세션으로 충분, 대화 세션
  관리 API는 optional).

## 3. 개발 과정 요구사항

- AI 기반 개발 툴(Claude Code 등) **필수 사용**. 해당 언어/프레임워크에 익숙하지
  않아도 AI 툴 활용해서 구현하면 됨.
- 서비스 재시작 후에도 상태가 보존되도록 **DB 등 영속 저장소** 사용 (인메모리 금지).
- 유연하고 확장 가능한 설계.
- "그냥 돌아가는 코드"가 아니라 **동료 코드리뷰를 통과할 수준**으로 작성.
- **퀄리티 있는 테스트 코드 필수.**
- 요구사항 중 불명확한 부분은 합리적으로 가정하고, 그 가정을 문서에 명시.

## 4. 제출물 (반드시 포함)

1. **GitHub private repository**에 코드 업로드 + `ringle-recruiting` GitHub App
   설치해서 접근 권한 부여 (https://github.com/apps/ringle-recruiting, "Only
   select repositories"로 이 repo만 선택). 설치 후 repo가 private인지 확인.
   지원 메일에 repo 링크 포함. **zip 제출 금지.**
2. `README.md` (또는 별도 문서)에 반드시 포함:
   - 실행 방법
   - 설계 및 기술 스택 선정 배경 (LLM/STT/TTS provider 선택 이유 포함 — 특정
     provider 제한/권장 없음, 선택 이유만 서술)
   - 테스트 및 검증 방법
3. **`docs/coding_agent_interaction_history.md`** (repo top-level, `.pdf`도 가능)
   — AI 개발 툴 사용 기록. 다음을 포함해야 함:
   - 툴에 어떤 방식으로 prompt를 입력했는지
   - 툴이 생성한 코드(output)를 어떻게 검토/수정/검증했는지
   - **스크린샷 포함 필수** (입력, 출력, 결과물 사용 예시 등)
   - ⚠️ 이 프로젝트에는 `.claude/hooks/record_interaction_history.py`가 Stop
     훅으로 등록되어 있어 대화 턴마다 이 파일에 텍스트를 자동으로 append한다.
     2026-07-30에 "툴 사용내역은 필요 없고 prompt text만"으로 범위를 좁혀서,
     지금은 사용자 프롬프트/어시스턴트 답변 텍스트만 기록하고 **도구 호출·결과는
     기록하지 않는다.** 그 결과 아래 두 가지는 제출 전 반드시 수동으로 보강해야
     한다: **스크린샷**(원래도 자동 기록 대상 아니었음), 그리고 **"툴 출력을 어떻게
     검토/수정/검증했는지"**(도구 호출 로그가 빠지면서 텍스트만으론 이 부분이
     비게 됨).
   - ⚠️ 세션 도중에 `.claude/settings.json`을 새로 만들면 Claude Code의 설정
     watcher가 즉시 인식하지 못해 Stop 훅이 조용히 안 붙는 경우가 있었다
     (2026-07-30에 실제로 겪음: 훅 등록 후 한참 동안 자동 실행이 전혀 안 되고
     있었음, `/hooks` 재오픈 또는 재시작으로 해결). 이 문서가 최신인지 의심되면
     `.claude/hooks/.interaction_history_state.json`의 처리된 라인 수와 실제
     transcript(`~/.claude/projects/.../*.jsonl`) 줄 수를 비교해서 확인할 것.
4. **시연 영상** 첨부 — 구현한 요구사항이 정상 동작하는지 확인 가능해야 하고,
   AI와 대화하는 부분에서 **AI 튜터 오디오가 실제로 들리는지** 확인 후 제출.
   Google Drive(링크 있는 모든 사용자) 또는 YouTube Unlisted로 공유.

---

## 5. 코딩 컨벤션 (`development-ruby` 스킬 기준, 2026-07-30 전체 리팩터로 확정)

- **API를 하나 작성/변경할 때마다 프로젝트 루트 `api.md` 하나에 명세를 같이
  작성한다** (예전엔 `docs/api/*.md`로 리소스별 분리했었는데, 스킬 컨벤션에
  맞춰 단일 파일로 통합함). 각 엔드포인트마다 Method/URL/Request
  Headers/Path·Query Parameters/Request Body/Success Response/Error
  Response(상태 코드+error code 표)를 남긴다.
- 컨트롤러에서 직접 `Model.find`/`Model.where` 등을 호출하지 않는다. 조회/생성/
  삭제 등 실질적인 로직은 전부 `app/services/*`로 옮기고, 컨트롤러는
  파라미터 추출 → 서비스 호출 → 렌더링만 담당한다.
- **서비스는 `네임스페이스::동사` 형태 + 인스턴스 `call` 메서드로 통일한다**
  (예: `Memberships::Grant.new(...).call`, `Auth::Login.new(request:).call`).
  프로젝트 전체에서 실행 메서드명을 `call` 하나로 통일 — 예전엔
  `AuthService.login`/`PaymentService.pay`/`XxxQueryService.find`처럼 제각각
  이었다가 통일함. 외부 의존성(결제 게이트웨이 등)은 생성자로 주입
  (`payment_gateway: MockPaymentGatewayClient.new`), 하드코딩 안 함 — 테스트
  시 다른 구현으로 교체 가능하게.
- **서비스는 엔티티가 아니라 DTO(`app/dtos/*Dto`, `Data.define` 기반)를 반환한다.**
  컨트롤러는 서비스가 돌려준 DTO를 그대로 `render json:`에 넘기면 되고, 엔티티→DTO
  변환 코드가 컨트롤러에 있으면 안 된다 (요청 파싱용 `XxxRequestDto.from(params)`
  는 예외 — 이건 서비스 호출 전 컨트롤러의 역할).
- **모델 상태 변경은 서비스에서 직접 `update!`하지 말고 의미 있는 도메인
  메서드를 모델에 두고 호출한다** (예: `member_membership.grant!(membership)`,
  `purchase_history.complete!`/`.fail!`, `PurchaseHistory.record_order/
  record_admin_grant/record_cancel`). 서비스가 attribute를 직접 건드리지 않음.
- **하나의 unit of work(여러 모델에 걸친 변경)는 `ActiveRecord::Base.transaction`
  으로 묶는다** (예: `Memberships::Grant`/`Revoke`의 member_membership +
  purchase_history 동시 write). 외부 API(결제 게이트웨이 등) 호출은 트랜잭션
  밖에서 한다.
- **동시성이 걱정되는 곳은 처리 방법을 한글 주석으로 남긴다.** 예:
  `Memberships::Grant`는 동시 요청으로 `member_memberships`의 `member_id`
  unique 제약을 두 번 건드리면 `ActiveRecord::RecordNotUnique`가 나는데,
  이미 생긴 row를 다시 찾아 갱신하도록 한 번만 재시도하는 방어 로직이 있음.
- 에러 처리는 `app/controllers/concerns/error_handling.rb`(Concern)에 모아두고
  `ApplicationController`가 `include`한다. 공통으로 처리 가능한 예외
  (`ActiveRecord::RecordNotFound` → 404, `RecordInvalid` → 422 등)는 컨트롤러
  액션마다 개별 rescue 하지 말고 여기에 추가한다.
- **에러 응답은 항상 `{ code, message }` 형태.** `ApplicationController#render_error
  (code:, message:, status:)`를 쓴다. 커스텀 예외는 `CODE` 상수를 갖는다
  (예: `Auth::Login::InvalidCredentialsError::CODE`). `RecordNotFound`는
  자동으로 `"#{모델명}_NOT_FOUND"` 코드를 만든다.
- **URL에 동사를 쓰지 않는다.** 로그인/로그아웃은 `/auth/login`이 아니라
  `POST|DELETE /api/v1/session`(단수 — "내 세션" 하나뿐이라 Rails의
  `resource :session` 관례를 따름)으로 표현한다.

---

## 현재까지의 결정 사항 (구현 진행 상황)

- Backend: `rails new . --api --database=postgresql` (Rails 8.1, Ruby 3.4.10
  via rbenv, 로컬 PostgreSQL 17). 마이그레이션 항상 수동 실행
  (`bin/docker-entrypoint`의 자동 `db:prepare` 제거함, Rails/ActiveRecord엔
  애초에 Hibernate식 ddl-auto 없음).
- 코드 구조: `app/models`(엔티티, 도메인 메서드 포함) / `app/dtos`
  (`Data.define` 기반 응답 DTO, `*Dto.from(model)` 팩토리) / `app/services/
  <리소스>/<동사>.rb`(`네임스페이스::동사` + 인스턴스 `call`, 섹션 5 참고) /
  `app/controllers/api/v1`. 컨트롤러는 파라미터 추출 → 서비스 호출 →
  렌더링만, 모델 직접 조회·에러 응답 문자열 조립 금지.
- 인증: 과제 요구사항상 정식 인증 로직은 제외 대상이지만, 결제 API 등에서
  클라이언트가 임의 member_id를 보내는 걸 막기 위해 최소한의 세션 인증을
  추가함. `login_id` + 비밀번호(bcrypt)로 로그인 → 쿠키 세션
  (`session[:member_id]`) → `ApplicationController`의 `before_action`이
  `Current.member`(`ActiveSupport::CurrentAttributes`, Spring의
  SecurityContext에 대응)에 채워줌. `POST|DELETE /api/v1/session`(로그인/
  로그아웃, `Auth::Login`), `GET /api/v1/members/:id`(본인 또는 admin만,
  `Members::Find`) — "내 멤버십 조회"는 이 엔드포인트로 충분해서 별도 API
  안 만듦.
- 권한: `members.role` enum(`user`(기본)/`admin`). 별도 Admin 엔티티 없이 같은
  Member 테이블에서 역할로만 구분. `Api::V1::Admin::BaseController`가
  `require_admin!`을 강제. 멤버십 기능 권한(학습/대화/분석)은
  `permissions`/`membership_permissions` 카탈로그 테이블로 관리(boolean
  컬럼 아님 — 나중에 권한이 늘어나도 seed row만 추가하면 됨, `Permission::STUDY`
  등 상수로 참조). `require_membership_permission!`이 "활성 멤버십 + 해당
  권한 보유"를 강제 — `POST /api/v1/realtime_sessions`가 첫 사용처.
- 멤버십: `GET /api/v1/memberships`(`Memberships::List`)/`:id`(`Memberships::
  Find`)는 로그인 불필요(카탈로그 공개). 부여/회수는
  `POST|DELETE /api/v1/admin/members/:member_id/membership`(admin 전용,
  `Memberships::Grant`/`Revoke`) — 결제 API도 `Memberships::Grant`를 그대로
  재사용. **재구매/재부여는 연장**(요구사항엔 명시 안 돼 있어 직접 가정):
  이미 활성 멤버십이 있으면 기존 `expires_at` + 새 `duration_days`, 없거나
  만료됐으면 지금부터 새로 시작 — `MemberMembership#grant!`에 캡슐화.
  `Memberships::Grant`는 member_membership 갱신 + purchase_history 기록을
  `ActiveRecord::Base.transaction`으로 묶고, 동시 요청으로 `member_id` unique
  제약을 두 번 건드리면(`ActiveRecord::RecordNotUnique`) 한 번 재시도한다.
- 결제: `POST /api/v1/payments`(로그인 필요, `Current.member`가 결제자 —
  클라이언트가 member_id를 못 정함, `Payments::Create`). (1) order:
  `PurchaseHistory.record_order`로 pending 기록, (2)
  `MockPaymentGatewayClient#charge`로 mock PG 호출(생성자로 주입, **항상
  성공** — 실제 PG 연동은 제외 요구사항), (3) 성공 시 그 pending row를
  `Memberships::Grant`에 넘겨서 새 row 없이 completed로 갱신 + 멤버십 부여,
  실패 시 `purchase_history.fail!` + `402 Payment Required`.
  `purchase_histories.source`로 구매(`purchase`)/어드민부여(`admin`)/
  취소(`cancel`)가 전부 구분됨.
- **LLM/STT/TTS = OpenAI Realtime API, 프론트→OpenAI 직접 WebRTC 연결**(지연
  시간 최소화). 진짜 API 키는 절대 프론트에 노출하지 않고, 백엔드가
  `POST /api/v1/realtime_sessions`(`RealtimeSessions::Create` →
  `OpenaiRealtimeGatewayClient`)로 단기(10분) ephemeral client secret만
  발급. 프론트는 그 secret으로 `POST https://api.openai.com/v1/realtime/calls`
  에 SDP offer를 직접 보내 WebRTC 연결. 상세: `api.md`.
  `Rails.application.credentials.openai_api_key` 설정 필요(아직 비어있음,
  `bin/rails credentials:edit`로 본인 키 추가 — 별도 제공 키 없음).
- `topics`(학습 주제): `title`, `deleted_at`(soft delete, `Topic.active`
  스코프). soft delete는 프로젝트 전체에서 **`deleted_at`만 사용**
  (`is_deleted` boolean 같은 별도 플래그 안 씀 — null이면 안 지워진 것, 값
  있으면 삭제된 것, 복구는 다시 null로). 본문은 `topics`에 직접 안 두고
  `locales`(카탈로그: `ko`/`eng`) + `topic_translations`(매핑 + `content`)로
  분리(권한과 동일 패턴). `GET /api/v1/topics`(`Topics::List`, 제목만)/
  `:id`(`Topics::Find`, `translations: {ko, eng}` 포함, eager load로 N+1 방지)
  는 로그인 불필요. `db/seeds.rb`에 주제 5개 + 멤버십 플랜(베이직/프리미엄)
  시딩되어 있음(`bin/rails db:seed`).
- 에러 응답은 전부 `{ code, message }` (섹션 5), 명세는 `api.md` 하나에.
- Frontend: `frontend/`에 Vite + React + TypeScript, `react-router-dom`
  (7.18.2 고정 — RSC 전용 CVE만 있고 순수 클라이언트 SPA라 무관), Tailwind
  CSS v4(`@tailwindcss/vite`). Vite dev proxy(`/api` → `:3000`) + Rails
  `rack-cors`(origin: localhost:5173, credentials: true)로 개발 중 연동.
  페이지: `/`(MainPage, 라우팅용) `/login` `/mypage` `/membership/purchase`
  `/study`(주제 리스트) `/study/:topicId`(학습 상세 — 대화 화면).
  `src/types/api.ts`가 백엔드 DTO와 필드명 1:1로 맞춰져 있어 매핑 불필요.
  **realtime_sessions 빼고 전부 실제 백엔드 API에 연결됨**
  (`src/api/{client,session,members,memberships,payments,topics}.ts` —
  `client.ts`가 공통 fetch 래퍼, `credentials: "include"`로 세션 쿠키 포함).
  로그인 상태는 `src/context/AuthContext.tsx`(React Context)로 관리. 세션
  쿠키가 httponly라 JS로 못 읽으므로, 로그인 응답의 내 id를
  `localStorage`(`ringle-member-id`)에 기억해뒀다가 새로고침 시 그 id로
  `GET /members/:id`(본인 조회 허용)를 다시 불러 로그인 상태 복원 — 403이면
  세션 만료로 보고 로그아웃 처리.
  `/study/:topicId`: 주제 정보(제목/번역)는 `GET /topics/:id`로 실제 조회,
  **대화 부분(마이크/waveform/답변완료/AI응답/재생)은 여전히 mock** — 마이크
  버튼→waveform 표시→답변완료→유저 발화(mock 텍스트)+AI 응답(지연 후 mock
  텍스트) 추가, 재생 버튼(mock). 대화 기록은 `localStorage`
  (`ringle-conversation-{topicId}` 키)에 저장 — 요구사항의 "대화 세션은
  클라이언트단 일회성으로 충분"과 일치. 실제 LLM/STT/TTS 연동(`api.md`의
  OpenAI Realtime WebRTC 흐름으로 교체)이 다음 단계.
- 아직 미착수: `realtime_sessions` 프론트 연동(WebRTC/VAD/waveform 실제
  구현), 환불 API(유저 셀프 취소 여부 결정 필요), 어드민 UI, 테스트 코드
  (여전히 0개), README 상세 작성, GitHub private repo 생성 및 App 설치,
  시연 영상.
- 2026-07-31: 레포 최상위 구조를 `backend/`(기존 Rails 루트 전체) /
  `frontend/` / `docs/` 세 디렉토리로 분리(이전엔 Rails 앱이 레포 루트에
  바로 있었음). `.github/workflows/ci.yml`도 각 job에
  `working-directory: backend` 추가해서 맞춤. 로컬에서 `backend/`로 이동
  후 실제로 `bundle install`/`bundle exec rspec`/`bundle exec rubocop`/
  `bin/rails runner`(DB 쿼리까지) 전부 정상 동작 확인, CI도 그린 확인.
