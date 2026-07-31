import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { topicsApi } from "../api/topics";
import { ApiError } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { VOICE_OPTIONS, getStoredVoice, setStoredVoice } from "../constants/voicePreference";
import type { TopicDetail } from "../types/api";

export default function StudyIntroPage() {
  const { topicId } = useParams<{ topicId: string }>();
  const { currentMember } = useAuth();
  const navigate = useNavigate();

  const [topic, setTopic] = useState<TopicDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showMembershipModal, setShowMembershipModal] = useState(false);
  const [voice, setVoice] = useState(() => getStoredVoice());

  useEffect(() => {
    if (!topicId) return;
    setIsLoading(true);
    topicsApi
      .get(Number(topicId))
      .then(setTopic)
      .catch((err) => setLoadError(err instanceof ApiError ? err.message : "주제를 불러오지 못했습니다."))
      .finally(() => setIsLoading(false));
  }, [topicId]);

  if (isLoading) {
    return <p className="text-center text-gray-500">불러오는 중...</p>;
  }

  if (!topic || loadError) {
    return (
      <div className="flex flex-col items-center gap-4 py-16 text-center">
        <p className="text-gray-500">{loadError ?? "주제를 찾을 수 없습니다."}</p>
        <Link to="/study" className="text-sm font-medium text-violet-600 hover:underline">
          ← 학습 목록으로
        </Link>
      </div>
    );
  }

  const scenario = topic.paragraphs[0]?.translations.ko;

  const handleVoiceSelect = (nextVoice: string) => {
    setVoice(nextVoice);
    setStoredVoice(nextVoice);
  };

  const handleStart = () => {
    const memberMembership = currentMember?.membership;
    // AI와 실시간으로 음성 대화하는 기능은 "대화(converse)" 권한 영역 —
    // 베이직(학습만) 멤버십으로는 진입할 수 없고 프리미엄만 가능함
    // (백엔드 realtime_sessions/translations 컨트롤러와 동일 기준).
    const hasConverseAccess =
      !!memberMembership?.active && memberMembership.membership.permissions.includes("converse");

    if (!hasConverseAccess) {
      setShowMembershipModal(true);
      return;
    }

    navigate(`/study/${topicId}/conversation`);
  };

  return (
    <div className="flex flex-col gap-6">
      <Link to="/study" className="text-sm text-gray-500 hover:underline">
        ← 학습 목록
      </Link>

      <div className="flex flex-col items-center gap-4 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-violet-100 text-2xl">
          📢
        </div>
        <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-500">기타</span>
        <div>
          <h1 className="text-xl font-bold text-gray-900">{topic.title}</h1>
          <p className="mt-1 text-sm text-gray-500">{topic.title_en}</p>
        </div>
      </div>

      {scenario && (
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <h2 className="text-sm font-bold text-gray-900">시나리오</h2>
          <p className="mt-2 text-sm text-gray-700">{scenario}</p>
        </div>
      )}

      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <h2 className="text-sm font-bold text-gray-900">🎙️ AI 목소리</h2>
        <p className="mt-1 text-xs text-gray-500">대화할 AI의 목소리를 골라보세요.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {VOICE_OPTIONS.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => handleVoiceSelect(option)}
              aria-pressed={voice === option}
              className={`rounded-full px-4 py-1.5 text-xs font-semibold capitalize transition-colors ${
                voice === option
                  ? "bg-violet-600 text-white shadow-sm"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {option}
            </button>
          ))}
        </div>
      </div>

      <button
        type="button"
        onClick={handleStart}
        className="rounded-full bg-violet-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-violet-700"
      >
        대화 시작하기
      </button>

      {showMembershipModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/40 p-4">
          <div className="flex w-full max-w-sm flex-col gap-4 rounded-xl bg-white p-6 shadow-lg">
            <div>
              <h2 className="text-lg font-bold text-gray-900">멤버십이 필요합니다</h2>
              <p className="mt-2 text-sm text-gray-500">
                학습 기능을 이용할 수 있는 멤버십을 보유하고 있지 않아요. 이용권을 구매하고 학습을
                시작해보세요.
              </p>
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowMembershipModal(false)}
                className="rounded-md px-4 py-2 text-sm font-medium text-gray-500 hover:bg-gray-100"
              >
                닫기
              </button>
              <button
                type="button"
                onClick={() => navigate("/membership/purchase")}
                className="rounded-md bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700"
              >
                멤버십 구매하러 가기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
