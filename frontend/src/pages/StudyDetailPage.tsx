import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { topicsApi } from "../api/topics";
import { ApiError } from "../api/client";
import { useRealtimeConversation, VOICE_LEVEL_THRESHOLD } from "../hooks/useRealtimeConversation";
import { getStoredVoice } from "../constants/voicePreference";
import type { ConversationMessage, TopicDetail } from "../types/api";

// 대화 기록은 서버에 영속화하지 않고 클라이언트 세션(localStorage)에만 저장.
// 오디오는 base64 data URL로 저장해서 새로고침 후에도 재생 버튼이 그대로
// 동작함 — 단, 용량이 커서 대화가 길어지면 localStorage 용량 제한에
// 걸릴 수 있음(저장 실패 시 조용히 무시하고 텍스트만 유지).
function storageKey(topicId: string) {
  return `ringle-conversation-${topicId}`;
}

function loadMessages(topicId: string): ConversationMessage[] {
  const raw = localStorage.getItem(storageKey(topicId));
  if (!raw) return [];
  try {
    return JSON.parse(raw) as ConversationMessage[];
  } catch {
    return [];
  }
}

export default function StudyDetailPage() {
  const { topicId } = useParams<{ topicId: string }>();
  const navigate = useNavigate();

  const [topic, setTopic] = useState<TopicDetail | null>(null);
  const [isLoadingTopic, setIsLoadingTopic] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [initialMessages] = useState<ConversationMessage[]>(() => (topicId ? loadMessages(topicId) : []));
  // 주제 소개 화면에서 고른 값 — 대화 화면 진입 시점에 한 번만 읽는다
  // (세션 도중에 목소리를 바꾸는 기능은 아직 없음).
  const [voice] = useState(() => getStoredVoice());
  const [playingId, setPlayingId] = useState<string | null>(null);
  const playingAudioRef = useRef<HTMLAudioElement | null>(null);

  const {
    status,
    errorMessage,
    messages,
    isRecording,
    isAiResponding,
    audioLevel,
    startRecording,
    finishAnswer,
    reconnect,
    restart,
    turnCount,
    maxTurns,
    turnLimitReached,
    recordingSecondsLeft,
  } = useRealtimeConversation(topic, initialMessages, voice);

  // 이 레벨을 넘어야 "실제로 말하고 있다"고 보고 waveform에 그라데이션을 켬
  // — 무음/배경 잡음일 땐 그냥 낮은 회색 막대로만 표시. 훅의 클라이언트
  // VAD 게이팅과 같은 임계값을 공유(VOICE_LEVEL_THRESHOLD).
  const isVoiceActive = audioLevel > VOICE_LEVEL_THRESHOLD;

  useEffect(() => {
    if (!topicId) return;
    setIsLoadingTopic(true);
    topicsApi
      .get(Number(topicId))
      .then(setTopic)
      .catch((err) => setLoadError(err instanceof ApiError ? err.message : "주제를 불러오지 못했습니다."))
      .finally(() => setIsLoadingTopic(false));
  }, [topicId]);

  useEffect(() => {
    if (!topicId || messages.length === 0) return;
    try {
      localStorage.setItem(storageKey(topicId), JSON.stringify(messages));
    } catch (err) {
      // 오디오까지 저장하면서 용량이 커질 수 있음 — 저장 실패해도 대화
      // 자체는 계속 진행 가능해야 하므로 조용히 무시.
      console.warn("대화 기록 저장 실패 (localStorage 용량 초과 가능)", err);
    }
  }, [topicId, messages]);

  if (isLoadingTopic) {
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

  if (status === "idle" || status === "connecting") {
    return (
      <div className="flex flex-col items-center gap-2 py-16 text-center">
        <p className="text-gray-500">AI와 연결하는 중...</p>
        {errorMessage && <p className="text-sm text-amber-600">{errorMessage}</p>}
      </div>
    );
  }

  if (status === "failed") {
    return (
      <div className="flex flex-col items-center gap-4 py-16 text-center">
        <p className="text-gray-500">{errorMessage ?? "AI와 연결하지 못했습니다."}</p>
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={reconnect}
            className="rounded-full bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700"
          >
            다시 연결하기
          </button>
          <Link to={`/study/${topicId}`} className="text-sm font-medium text-violet-600 hover:underline">
            ← 주제 소개로
          </Link>
        </div>
      </div>
    );
  }

  const handleRestart = () => {
    if (topicId) localStorage.removeItem(storageKey(topicId));
    restart();
  };

  // 턴 상한(오남용 방지 장치)에 도달하면 세션을 이어가게 하는 대신, 대화
  // 기록을 전부 지우고 주제 목록으로 돌려보낸다 — WebRTC 연결은 이 페이지가
  // 언마운트되면서 훅의 정리 로직이 알아서 끊는다.
  const handleTurnLimitEnd = () => {
    if (topicId) localStorage.removeItem(storageKey(topicId));
    navigate("/study");
  };

  const handlePlay = (message: ConversationMessage) => {
    if (!message.audioUrl) return;

    if (playingId === message.id) {
      playingAudioRef.current?.pause();
      setPlayingId(null);
      return;
    }

    playingAudioRef.current?.pause();
    const audio = new Audio(message.audioUrl);
    audio.addEventListener("ended", () => setPlayingId(null));
    playingAudioRef.current = audio;
    void audio.play();
    setPlayingId(message.id);
  };

  // "답변완료" 직후(유저)/response.created 직후(AI) 생성되는 빈 텍스트
  // 자리표시자 메시지는 렌더링하지 않고, 아래 "텍스트로 변환하는 중..."/
  // "AI가 답변을 생성하는 중..." 표시로 대체. 자리표시자를 미리 만드는
  // 이유는 메시지 목록 순서(유저→AI)를 보장하기 위함(훅의
  // pendingUserMessageIdRef 주석 참고) — 순서는 배열에 이미 반영돼 있고,
  // 화면에 잠깐 안 보일 뿐 텍스트가 채워지면 제자리에 나타남.
  const visibleMessages = messages.filter((message) => message.text !== "");
  // 마지막 요소만 보면 안 됨 — AI 응답 placeholder가 뒤에 추가되는 순간
  // (유저 STT가 아직 안 끝났어도) 유저 쪽이 배열의 "마지막"이 아니게 돼서
  // 이 표시가 꺼져버리고, 나중에 유저 텍스트가 뒤늦게 위로 끼어드는 것처럼
  // 보이는 버그가 있었음. 배열 어디에든 대기 중인 유저 placeholder가
  // 있는지로 판단해야 AI 쪽 표시보다 항상 먼저(위에) 보임.
  const isTranscribingUserSpeech = messages.some((message) => message.role === "user" && message.text === "");
  // isAiResponding(response.done 전)만 보면 응답 생성은 끝났는데 오디오
  // 녹음/유저 텍스트 확정을 기다리는 동안(tryRevealAiTurn 대기 중) 표시가
  // 사라져버림 — 텍스트+오디오가 실제로 공개되기 전까지는 계속 "생성
  // 중"으로 보여줘야 하므로, isAiResponding 대신 "아직 안 채워진 assistant
  // placeholder가 있는지"로 판단.
  const isAwaitingAiTurn = messages.some((message) => message.role === "assistant" && message.text === "");

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link to={`/study/${topicId}`} className="text-sm text-gray-500 hover:underline">
            ← 주제 소개
          </Link>
          <h1 className="mt-1 text-xl font-bold text-gray-900">{topic.title}</h1>
        </div>
        <button
          type="button"
          onClick={handleRestart}
          className="shrink-0 rounded-full border border-gray-300 px-4 py-1.5 text-xs font-semibold text-gray-600 hover:border-violet-300 hover:text-violet-700"
        >
          다시 시작하기
        </button>
      </div>

      {errorMessage && status === "connected" && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{errorMessage}</p>
      )}

      <div className="flex min-h-[400px] flex-col gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        {visibleMessages.map((message) => (
          <div
            key={message.id}
            className={`flex items-end gap-2 ${
              message.role === "user" ? "flex-row-reverse" : "flex-row"
            }`}
          >
            <button
              type="button"
              onClick={() => handlePlay(message)}
              disabled={!message.audioUrl}
              className="shrink-0 rounded-full border border-gray-200 p-1.5 text-xs text-gray-500 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="다시 듣기"
            >
              {playingId === message.id ? "🔊" : "▶"}
            </button>
            <div
              className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm ${
                message.role === "user"
                  ? "bg-violet-600 text-white"
                  : "bg-gray-100 text-gray-900"
              }`}
            >
              <p>{message.text}</p>
              {message.translation && (
                <p
                  className={`mt-1 text-xs ${
                    message.role === "user" ? "text-violet-100" : "text-gray-500"
                  }`}
                >
                  {message.translation}
                </p>
              )}
            </div>
          </div>
        ))}

        {isTranscribingUserSpeech && (
          <div className="flex flex-row-reverse">
            <div className="mr-9 rounded-2xl bg-violet-100 px-4 py-2 text-sm text-violet-400">
              텍스트로 변환하는 중...
            </div>
          </div>
        )}

        {/* 유저 텍스트가 확정되기 전엔 AI 쪽 표시를 보여주지 않음 — 대화가
            "나 → 상대" 순서로 느껴지게 하기 위함(훅의 awaitingUserTranscriptRef
            주석 참고). AI 텍스트+오디오가 실제로 공개(tryRevealAiTurn)되기
            전까지는 이 표시를 계속 띄운다. */}
        {!isTranscribingUserSpeech && isAwaitingAiTurn && (
          <div className="flex flex-row">
            <div className="ml-9 rounded-2xl bg-gray-100 px-4 py-2 text-sm text-gray-400">
              AI가 답변을 생성하는 중...
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-col items-center gap-3 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        {isRecording ? (
          <>
            <div className="flex h-10 items-end gap-1" aria-label="waveform">
              {Array.from({ length: 12 }).map((_, i) => {
                // 막대마다 민감도를 살짝 다르게 줘서 실제 파형처럼 보이게 함.
                const sensitivity = 0.7 + ((i * 37) % 60) / 100;
                const height = Math.min(100, 12 + audioLevel * 100 * sensitivity);
                return (
                  <span
                    key={i}
                    className={`w-1.5 rounded-full transition-[height] duration-75 ${
                      isVoiceActive
                        ? "bg-gradient-to-t from-violet-600 to-fuchsia-400"
                        : "bg-gray-300"
                    }`}
                    style={{ height: `${height}%` }}
                  />
                );
              })}
            </div>
            <p className="text-sm text-gray-500">{isVoiceActive ? "듣고 있어요..." : "말씀해주세요"}</p>
            <p className="text-xs text-gray-400">남은 시간 {recordingSecondsLeft}초</p>
            <button
              type="button"
              onClick={finishAnswer}
              className="rounded-full bg-violet-600 px-6 py-2 text-sm font-semibold text-white hover:bg-violet-700"
            >
              답변완료
            </button>
          </>
        ) : turnLimitReached ? (
          <>
            <p className="text-sm text-gray-500">
              이번 대화 세션에서 사용 가능한 대화 횟수({maxTurns}회)를 모두 사용했습니다.
            </p>
            <button
              type="button"
              onClick={handleTurnLimitEnd}
              className="rounded-full bg-violet-600 px-6 py-2 text-sm font-semibold text-white hover:bg-violet-700"
            >
              대화 종료하고 목록으로
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={startRecording}
              disabled={isAiResponding}
              className="flex h-16 w-16 items-center justify-center rounded-full bg-violet-600 text-2xl text-white shadow-md transition-colors hover:bg-violet-700 disabled:cursor-not-allowed disabled:bg-gray-300"
              aria-label="마이크 시작"
            >
              🎙
            </button>
            <p className="text-xs text-gray-400">
              {turnCount}/{maxTurns}턴 사용
            </p>
          </>
        )}
      </div>

      <div className="rounded-xl border border-gray-200 bg-violet-50 p-4">
        <h2 className="text-sm font-bold text-gray-900">🎤 마이크 사용 권한</h2>
        <p className="mt-2 text-sm text-gray-600">
          링글 AI와 영어로 대화를 나누기 위해서는 마이크 사용 권한이 필요합니다.
        </p>
      </div>
    </div>
  );
}
