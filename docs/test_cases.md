# 테스트 케이스(TC)

`bundle exec rspec`(백엔드) / `npm test`(프론트엔드)로 실행되는 자동화 테스트 케이스 전체 목록입니다. 

## 1. 백엔드 (RSpec, 162개)

### 1.1 모델 (`spec/models`)

- **Locale**: 연관관계(topic_paragraph_translations/topic_paragraphs/topics), `name` 필수·유일성 검증
- **Member**: 연관관계(member_membership/purchase_histories), `login_id`/`username`/`password` 검증(10자 이상, 유일성), `role` 기본값/admin 허용, `#authenticate`(정답/오답 비밀번호), `.active`(soft-delete 제외), `#deleted?`
- **MemberMembership**: 연관관계, `member_id` 유일성, `#active?`(만료 전/후), `#grant!`(신규 시작 / **같은 플랜 재구매·재부여 시 연장** / **다른 플랜으로 바뀌면 연장 없이 지금부터 새로 시작** / 만료 후 재시작 / 멤버십 갱신)
- **Membership**: 연관관계, `name`/`duration_days`/`price` 검증, `#permission?`(보유/미보유)
- **MembershipPermission**: 연관관계, 동일 멤버십에 같은 권한 중복 불가, 다른 멤버십엔 허용
- **Permission**: 연관관계, `name` 필수·유일성 검증
- **PurchaseHistory**: 연관관계, `source`/`state`/`price_at_purchase` 검증, `source`/`state` enum, `.record_order`/`.record_admin_grant`/`.record_cancel`, `#complete!`/`#fail!`
- **Topic**: 연관관계, `title`/`title_en` 필수 검증, `.active`, `#deleted?`, `#topic_paragraphs`(position 순 정렬)
- **TopicParagraph**: 연관관계, `position` 필수·유일성(topic 범위)·정수 검증
- **TopicParagraphTranslation**: 연관관계, `content` 필수 검증, 한 문단에 같은 언어 중복 불가

### 1.2 서비스 (`spec/services`)

- **Auth::Login**: 로그인 성공(DTO 반환), 비밀번호 불일치/존재하지 않는 아이디(`InvalidCredentialsError`), 삭제된 회원 로그인 불가
- **Members::Find**: 멤버십 없음/있음 DTO, 존재하지 않으면 `RecordNotFound`, 삭제된 회원 조회 불가
- **Members::List**: id 순 + 멤버십 정보 포함 DTO 목록, 삭제된 회원 제외
- **Memberships::Find**: 권한 이름 포함 DTO 반환, 존재하지 않으면 `RecordNotFound`
- **Memberships::Grant**: DTO 반환, 관리자 부여(구매 이력 신규 생성)/결제(pending 이력을 완료 처리), **같은 플랜 재구매·재부여 시 기존 만료일로부터 연장**, **다른 플랜으로 바뀌면 연장하지 않고 지금부터 새로 시작**, 만료된 멤버십은 지금부터 새로 시작, 기존 row 연장 시 락을 걸고 조회(동시 연장 유실 방지), 동시 요청 `RecordNotUnique` 1회 재시도 성공·재시도 후에도 실패 시 예외 전파
- **Memberships::List**: 전체 DTO 목록, 빈 배열
- **Memberships::Revoke**: 회수 + 취소 이력 반환, 취소 이력 기록, 보유 멤버십 없으면 `NoActiveMembershipError`, 존재하지 않는 회원이면 `RecordNotFound`
- **Payments::Create**: 결제 성공(멤버십 부여, pending 이력 완료 처리), 결제 실패(이력 실패 기록 + `PaymentFailedError`, 멤버십 미부여), 존재하지 않는 멤버십이면 `RecordNotFound`
- **RealtimeSessions::Create**: 게이트웨이 응답 → 세션 DTO 변환, `ProviderError` 전파, voice 지정 시 그대로 전달/미지정 시 nil 전달(게이트웨이 기본값), 허용되지 않은 voice면 `InvalidVoiceError`(게이트웨이 미호출)
- **Topics::Find**: position 순 문단 + 언어별 hash 반환, 번역 없는 언어 제외, 삭제된 주제 조회 불가, 존재하지 않으면 `RecordNotFound`
- **Topics::List**: 삭제되지 않은 주제 목록 DTO 반환
- **Translations::Create**: 게이트웨이 응답 → DTO 변환, `ProviderError` 전파, 빈 텍스트/공백만 있는 텍스트(`BlankTextError`, 게이트웨이 미호출), 최대 길이 초과(`TextTooLongError`, 게이트웨이 미호출), 최대 길이와 같으면 통과

### 1.3 요청 스펙 (`spec/requests/api/v1`)

- **POST/DELETE /api/v1/session**: 로그인 성공(회원 정보 + 세션 생성), 비밀번호 오류/존재하지 않는 아이디(401 `INVALID_CREDENTIALS`), 로그아웃(204 + 세션 삭제)
- **GET /api/v1/members/:id**: 본인 조회, 관리자의 타인 조회, 본인도 관리자도 아니면 403, 비로그인은 401이 아닌 403, 존재하지 않으면 404 `MEMBER_NOT_FOUND`
- **GET /api/v1/memberships, /:id**: 비로그인 목록 조회, 단건 조회, 존재하지 않으면 404 `MEMBERSHIP_NOT_FOUND`
- **GET /api/v1/admin/members**: 관리자의 멤버십 포함 목록 조회, 비관리자/비로그인 403
- **POST/DELETE /api/v1/admin/members/:member_id/membership**: 관리자 부여/회수 성공, 비관리자·비로그인 403, 보유 멤버십 없이 회수 시 422 `NO_ACTIVE_MEMBERSHIP`
- **POST /api/v1/payments**: 로그인 결제 성공(멤버십 부여), 비로그인 401 `UNAUTHORIZED`, 존재하지 않는 멤버십 404 `MEMBERSHIP_NOT_FOUND`
- **POST /api/v1/realtime_sessions**: 비로그인 401, **converse 권한 없음/미보유 멤버십/만료된 멤버십** 403 `MEMBERSHIP_PERMISSION_REQUIRED`, 권한 통과 시(테스트 환경엔 OpenAI 키 없음) 502 `PROVIDER_ERROR`, 허용되지 않은 voice면 422 `INVALID_VOICE`
- **GET /api/v1/topics, /:id**: 비로그인 목록/상세 조회, 언어별 번역 순서대로 반환, 존재하지 않으면 404 `TOPIC_NOT_FOUND`
- **POST /api/v1/translations**: 비로그인 401, **converse 권한 없음** 403 `MEMBERSHIP_PERMISSION_REQUIRED`, 권한 통과 시 502 `PROVIDER_ERROR`, 빈 텍스트 422 `BLANK_TEXT`, 최대 길이 초과 422 `TEXT_TOO_LONG`

## 2. 프론트엔드 (Vitest + React Testing Library, 83개)

### 2.1 API 클라이언트 (`src/api/client.test.ts`, `src/api/wrappers.test.ts`)

- `ApiError`가 `{ code, message }` 응답/그 외 응답에서 메시지·코드를 올바르게 뽑는지
- `apiFetch`가 `/api/v1` 프리픽스, `credentials: include`, JSON 직렬화, `204 No Content` 처리, 실패 시 `ApiError` throw를 올바르게 하는지
- `sessionApi`/`membersApi`/`membershipsApi`/`paymentsApi`/`topicsApi`/`realtimeSessionsApi`/`translationsApi` 각 래퍼가 `apiFetch`를 올바른 인자로 호출하는지

### 2.2 AuthContext (`src/context/AuthContext.test.tsx`)

- 저장된 id 없음(로그인 안 된 상태로 로딩 종료), 저장된 id로 상태 복원, `ApiError` 시 저장값 제거 후 로그아웃 처리
- `login()`(세션 생성 + id 저장 + 내 정보 조회)
- `logout()`은 세션을 지우고 저장값과 상태를 초기화한다
- `logout()`은 대화 기록 등 다른 `ringle-` 접두사 localStorage 키도 모두 지운다(계정 전환 시 이전 계정 데이터가 남지 않도록)

### 2.3 LoginModal (`src/components/LoginModal.test.tsx`)

- `isLoginModalOpen`이 false면 렌더링 안 함
- 로그인 성공 시 모달 닫힘, 실패 시 에러 메시지 표시 + 모달 유지
- 오버레이 클릭/닫기 버튼 클릭 시 모달 닫힘

### 2.4 useRealtimeConversation 훅 (`src/hooks/useRealtimeConversation.test.ts`)

- topic이 null이면 연결 안 함
- 연결 성공 시 `session.update` 전송(`turn_detection: null`, `transcription.language: "en"`) + 첫 방문이면 인사말(`response.create`) 트리거, 재방문(대화 기록 있음)이면 인사말 미트리거
- voice를 지정하면 세션 발급 API에 그대로 전달
- **재방문 시 화면에 남아있던 기존 대화를 `conversation.item.create`로 모델에도 재생시킨다**(유저는 `input_text`, AI는 `text` 콘텐츠 타입, 아직 공개 전인 빈 placeholder는 재생 대상에서 제외)
- 답변완료 시 만들어둔 유저 메시지 자리를 STT 결과로 채우고 번역 요청
- AI 응답 이벤트가 유저 STT 완료보다 먼저 도착해도 메시지 순서는 유저→AI로 유지
- 유저 텍스트가 확정되기 전엔 AI 응답 텍스트를 화면에 반영하지 않고, 확정되는 순간 한꺼번에 공개
- 첫 인사말처럼 유저 발화를 기다리지 않는 응답도 델타 도중엔 텍스트를 보여주지 않고, 응답이 끝나야 한꺼번에 공개(텍스트·오디오 동시 공개 통일)
- `response.done`이 와도 AI 오디오 recorder를 바로 멈추지 않고, 오디오가 실제로 조용해질 때까지 기다렸다가 멈춤(무음 감지 hangover)
- AI 오디오 녹음이 유저 텍스트 확정 전에 끝나면 바로 재생하지 않고, 유저 텍스트가 확정되는 순간 재생
- 유저 텍스트가 이미 확정된 뒤에 AI 오디오 녹음이 끝나면 바로 재생
- 마이크 권한 거부 시 에러 메시지, 마이크 획득 시 트랙 연결 + 녹음 상태 전환
- 레벨 미터/로컬 녹음은 VAD로 게이팅되는 원본 트랙이 아니라 별도 clone을 씀(원본이 꺼져도 레벨 측정이 안 죽도록)
- 발화 감지 안 됨(clear만 전송, 응답 미요청) / 발화 감지됨(commit + response.create) 분기
- 턴 카운트 증가(발화 있는 턴만), 최대 턴(`maxTurns`) 도달 시 마이크 시작 차단, reconnect 시 턴 카운트 초기화
- restart() 호출 시 메시지 초기화 + 새 세션으로 인사말 재트리거
- 연결 실패(일반 오류는 재시도 예약, 401/403은 즉시 실패), 수동 reconnect(), 연결 후 네트워크 끊김 시 재연결 예약

### 2.5 MyPage (`src/pages/MyPage.test.tsx`)

- 로딩 중 텍스트, 로그인 안 됐으면 로그인 모달을 여는 버튼
- 멤버십이 없으면 구매 유도 링크와 함께 회원 정보 표시
- 활성 멤버십이 있으면 이용 중 배지와 권한 목록 표시
- 만료된 멤버십이면 만료됨 배지와 구매 유도 링크를 같이 표시

### 2.6 AdminMembersPage (`src/pages/AdminMembersPage.test.tsx`)

- 관리자가 아니면 접근 불가 메시지를 보여주고 목록을 불러오지 않음
- 관리자면 회원 목록과 보유 멤버십 상태 표시, 불러오기 실패 시 에러 메시지
- 부여 버튼을 누르면 선택된 멤버십으로 할당 API를 호출하고 목록 새로고침
- 회수 버튼은 멤버십이 없으면 비활성화, 있으면 눌러서 회수 가능
- 할당/회수 실패 시 에러 메시지 표시

### 2.7 MembershipPurchasePage (`src/pages/MembershipPurchasePage.test.tsx`)

- 멤버십 목록을 불러와 이름/가격/권한 표시
- 로그인 안 된 상태에서 구매를 누르면 로그인 모달을 열고 결제 API는 호출하지 않음
- 로그인 상태에서 구매하면 결제 후 내 정보 새로고침하고 마이페이지로 이동
- 결제 실패하면 에러 메시지를 보여주고 이동하지 않음
- **이미 다른 플랜의 활성 멤버십이 있으면 구매 전에 전환 확인 팝업을 띄우고, 바로 결제하지 않는다**
- 전환 확인 팝업에서 '계속 구매하기'를 누르면 결제를 진행한다
- 전환 확인 팝업에서 '취소'를 누르면 팝업만 닫히고 결제하지 않는다
- 같은 플랜을 재구매하는 경우엔 전환 확인 팝업 없이 바로 결제한다

### 2.8 StudyIntroPage (`src/pages/StudyIntroPage.test.tsx`)

- 불러오는 중 로딩 텍스트, 주제 조회 실패 시 에러와 목록으로 돌아가는 링크
- 제목/영문 부제/첫 문단 시나리오 표시
- **converse 권한이 있는 활성 멤버십이면 대화 화면으로 이동**
- 로그인하지 않았으면(멤버십 없음) 팝업을 띄우고 이동하지 않음
- **converse 권한이 없는 멤버십(예: study만 있는 베이직)이면 팝업을 띄운다**
- 만료된 멤버십이면 converse 권한이 있어도 팝업을 띄움
- 팝업에서 '멤버십 구매하러 가기'를 누르면 구매 페이지로 이동, '닫기'를 누르면 팝업이 사라짐
- AI 목소리를 선택하면 localStorage에 저장

### 2.9 StudyPage (`src/pages/StudyPage.test.tsx`)

- 주제 목록을 불러와 각 주제로 가는 링크를 렌더링
- 불러오기 실패하면 에러 메시지를 보여줌
