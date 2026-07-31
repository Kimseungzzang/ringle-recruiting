import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

// 멤버십 종류(학습/대화/분석)를 소개하는 카드 — 실제 권한 값(PermissionName)과
// 무관하게 화면에 보여주기만 하는 정적 카피라 컴포넌트 밖에 상수로 둠.
const FEATURE_HIGHLIGHTS = [
  {
    emoji: "📖",
    title: "학습",
    description: "실무 상황을 담은 학습 주제를 따라가며 AI와 함께 표현을 익힙니다.",
  },
  {
    emoji: "🎙️",
    title: "대화",
    description: "주제 없이 AI와 자유롭게 음성으로 대화하며 실전 감각을 키웁니다.",
  },
  {
    emoji: "📊",
    title: "분석",
    description: "AI와 나눈 대화를 바탕으로 나의 영어 레벨을 확인합니다.",
  },
] as const;

const USAGE_STEPS = [
  { step: "1", title: "주제 선택", description: "관심있는 학습 주제를 골라 대화 화면으로 들어갑니다." },
  { step: "2", title: "음성으로 대화", description: "마이크 버튼을 누르고 말한 뒤, 답변완료로 AI 응답을 받습니다." },
  { step: "3", title: "다시 듣고 복습", description: "재생 버튼으로 내 발음과 AI 응답을 다시 들어볼 수 있습니다." },
] as const;

// 히어로 우측에 보여줄 대화 미리보기 — 실제 대화 데이터가 아니라 서비스가
// 어떻게 동작하는지 한눈에 보여주기 위한 정적 예시.
const PREVIEW_CONVERSATION = [
  { role: "assistant", text: "Could you introduce yourself and your role at work?" },
  { role: "user", text: "Hi, I'm Jiwon. I work as a product designer at a fintech startup." },
  { role: "assistant", text: "Nice to meet you! What does a typical day look like for you?" },
] as const;

// Landing/index route — 로그인 없이도 보여야 하는 공개 홈 화면(마케팅
// 소개 + 학습 주제 둘러보기는 비로그인 방문자도 접근 가능). 로그인 여부는
// "내 멤버십 현황" 카드와 마이페이지 링크에만 영향을 준다.
export default function MainPage() {
  const { currentMember, isLoading, openLoginModal } = useAuth();

  const hasActiveMembership = currentMember?.membership?.active ?? false;

  return (
    <div className="flex flex-col gap-16">
      {/* 배경을 뷰포트 끝까지 채우는 풀블리드 히어로 — 부모(AppLayout)의
          max-w 컨테이너를 벗어나기 위해 화면 너비만큼 늘린 뒤 다시 중앙
          정렬하는 트릭(w-screen + left-1/2 + -translate-x-1/2)을 씀. 이게
          없으면 히어로도 본문처럼 좁은 박스 안에 갇혀 보임. */}
      <section className="relative left-1/2 w-screen -translate-x-1/2 bg-gradient-to-br from-violet-50 via-white to-fuchsia-50">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-16 sm:grid-cols-2 sm:py-24">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-600">
              Ringle AI 튜터
            </p>
            <h1 className="mt-4 text-balance font-serif text-4xl font-bold leading-[1.1] tracking-tight text-gray-900 sm:text-5xl">
              언제 어디서든,
              <br />
              AI와 무제한 영어 연습
            </h1>
            <p className="mt-5 max-w-md text-base leading-relaxed text-gray-600">
              업무 상황에 맞춘 학습 주제로 시작해서, AI와의 실시간 음성 대화로
              자연스럽게 이어집니다.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-5">
              <Link
                to="/study"
                className="rounded-full bg-violet-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-violet-700"
              >
                학습 시작하기
              </Link>
              {!hasActiveMembership && (
                <Link
                  to="/membership/purchase"
                  className="text-sm font-semibold text-gray-700 hover:text-violet-700"
                >
                  이용권 보러가기 →
                </Link>
              )}
            </div>
          </div>

          <div className="relative">
            <div
              aria-hidden="true"
              className="absolute -right-3 -bottom-3 h-full w-full rounded-2xl bg-gradient-to-br from-violet-200 to-fuchsia-200"
            />
            <div className="relative rounded-2xl border border-gray-200 bg-white p-5 shadow-lg">
              <div className="flex items-center gap-1.5 border-b border-gray-100 pb-3">
                <span className="h-2.5 w-2.5 rounded-full bg-violet-400" />
                <span className="h-2.5 w-2.5 rounded-full bg-fuchsia-300" />
                <span className="h-2.5 w-2.5 rounded-full bg-gray-200" />
                <span className="ml-2 text-xs text-gray-400">오늘의 대화</span>
              </div>
              <div className="mt-4 flex flex-col gap-3 text-sm">
                {PREVIEW_CONVERSATION.map((message, i) => (
                  <div
                    key={i}
                    className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                      message.role === "user"
                        ? "ml-auto bg-violet-600 text-white"
                        : "bg-gray-100 text-gray-700"
                    }`}
                  >
                    {message.text}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="flex flex-col items-center justify-between gap-4 border-y border-gray-200 py-6 text-center sm:flex-row sm:text-left">
        {isLoading ? (
          <p className="text-gray-500">불러오는 중...</p>
        ) : currentMember ? (
          <>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                {currentMember.username}님, 환영합니다
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                {hasActiveMembership
                  ? `현재 "${currentMember.membership?.membership.name}" 멤버십을 이용 중입니다.`
                  : "보유 중인 멤버십이 없습니다. 이용권을 구매하고 시작해보세요."}
              </p>
            </div>
            <Link
              to={hasActiveMembership ? "/mypage" : "/membership/purchase"}
              className="shrink-0 rounded-full border border-gray-300 px-5 py-2 text-sm font-semibold text-gray-700 hover:border-violet-300 hover:text-violet-700"
            >
              {hasActiveMembership ? "마이페이지" : "이용권 구매"}
            </Link>
          </>
        ) : (
          <>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">로그인하고 나만의 학습을 시작하세요</h2>
              <p className="mt-1 text-sm text-gray-500">
                로그인하면 보유한 멤버십 현황과 학습 기록을 확인할 수 있습니다.
              </p>
            </div>
            <button
              type="button"
              onClick={openLoginModal}
              className="shrink-0 rounded-full bg-violet-600 px-5 py-2 text-sm font-semibold text-white hover:bg-violet-700"
            >
              로그인하러 가기 →
            </button>
          </>
        )}
      </section>

      <section>
        <h2 className="font-serif text-2xl font-bold tracking-tight text-gray-900">무엇을 할 수 있나요</h2>
        <p className="mt-1 text-sm text-gray-500">
          멤버십 종류에 따라 학습·대화·분석 기능을 조합해서 이용할 수 있습니다.
        </p>
        <div className="mt-6 divide-y divide-gray-200 border-t border-gray-200">
          {FEATURE_HIGHLIGHTS.map((feature) => (
            <div key={feature.title} className="flex items-start gap-4 py-5">
              <span className="text-2xl">{feature.emoji}</span>
              <div>
                <div className="font-semibold text-gray-900">{feature.title}</div>
                <p className="mt-1 text-sm text-gray-500">{feature.description}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="font-serif text-2xl font-bold tracking-tight text-gray-900">이렇게 진행돼요</h2>
        <div className="relative mt-10 grid grid-cols-1 gap-8 sm:grid-cols-3">
          <div
            aria-hidden="true"
            className="absolute top-4 right-0 left-0 hidden h-px bg-gray-200 sm:block"
          />
          {USAGE_STEPS.map((item) => (
            <div key={item.step} className="relative flex flex-col gap-2">
              <div className="relative z-10 flex h-8 w-8 items-center justify-center rounded-full bg-violet-600 text-sm font-bold text-white">
                {item.step}
              </div>
              <div className="font-semibold text-gray-900">{item.title}</div>
              <p className="text-sm text-gray-500">{item.description}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="relative left-1/2 w-screen -translate-x-1/2 bg-violet-50 py-16 text-center">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="font-serif text-2xl font-bold tracking-tight text-gray-900">
            지금 바로 시작해보세요
          </h2>
          <p className="mx-auto mt-2 max-w-sm text-sm text-gray-600">
            첫 대화는 AI가 먼저 시작합니다. 마이크만 준비하면 됩니다.
          </p>
          <Link
            to="/study"
            className="mt-6 inline-block rounded-full bg-violet-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-violet-700"
          >
            학습 주제 둘러보기
          </Link>
        </div>
      </section>
    </div>
  );
}
