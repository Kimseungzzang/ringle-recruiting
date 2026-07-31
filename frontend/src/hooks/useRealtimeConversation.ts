import { useCallback, useEffect, useRef, useState } from "react";
import { realtimeSessionsApi } from "../api/realtimeSessions";
import { translationsApi } from "../api/translations";
import { ApiError } from "../api/client";
import type { ConversationMessage, TopicDetail } from "../types/api";

// 한 턴(마이크 시작~답변완료)이 이 시간을 넘기면 자동으로 답변완료 처리 —
// 마이크를 열어둔 채 방치되는 것을 막기 위한 오남용 방지 조치.
const MAX_RECORDING_MS = 60_000;

const REALTIME_CALLS_URL = "https://api.openai.com/v1/realtime/calls";

// 네트워크 오류 등으로 연결이 끊기면 최대 이만큼 자동 재시도 — 지수 백오프로
// 간격을 늘려가며(2s, 4s, 8s) 서버에 부담을 덜 줌. 다 소진되면 status를
// "failed"로 보여주고 유저가 수동으로 재연결하게 함.
const MAX_RECONNECT_ATTEMPTS = 3;
const RECONNECT_BASE_DELAY_MS = 2_000;

// 한 대화 세션(연결 1회)에서 허용하는 최대 턴 수 — 마이크를 계속 열어두고
// 짧게 끊어서 무한정 요청을 보내는 오남용을 막기 위한 상한. 위의 60초 제한이
// "한 턴을 너무 길게 끄는 것"을 막는다면, 이건 "턴 자체를 너무 많이 반복하는
// 것"을 막는 별개의 조치 — 둘 다 필요함. 도달하면 마이크 버튼을 막고, 유저는
// 재연결(reconnect)로 새 세션을 시작해야 다시 대화할 수 있음.
const MAX_TURNS = 5;

// 이 값을 넘어야 "실제로 말하고 있다"고 판단 — 클라이언트 VAD(마이크 게이팅)와
// waveform UI가 같은 임계값을 공유하도록 여기서 export.
export const VOICE_LEVEL_THRESHOLD = 0.08;
// 레벨이 임계값 아래로 떨어져도 이 시간(ms) 동안은 계속 전송을 유지 —
// 단어/문장 사이 자연스러운 pause에 마이크가 꺼지지 않게 하는 hangover
// (유예) 구간. 발화 경계(턴이 끝났는지)는 서버가 아니라 전적으로
// "답변완료" 버튼으로 결정하므로(서버 VAD는 꺼둠, 아래 turn_detection
// 참고), 이 값은 순전히 "무음 구간은 전송 안 해서 대역폭/STT 비용을
// 아낀다"는 목적만 가짐 — 길게 잡아도 발화가 쪼개질 걱정은 없음.
const VOICE_HANGOVER_MS = 800;
// AI 오디오가 "완전히 끝났다"고 판단하는 hangover — 마이크 쪽(800ms)보다
// 훨씬 길게 잡아야 함. 이건 일시정지가 아니라 recorder를 완전히 멈추는
// 최종 결정이라, 문장 사이 자연스러운 pause(마침표/콜론 뒤 등)에 걸려서
// 응답 중간에 멈춰버리면 안 됨 — 실제로 "Hi there! ... email." 다음
// "Let's start: ..."로 이어지는 문장 사이 pause에 걸려 첫 문장만 녹음되는
// 버그가 있었음.
const AI_AUDIO_SILENCE_HANGOVER_MS = 1_200;
// AI 오디오 무음 감지가 어떤 이유로든 안 끝나는 경우를 대비한 안전장치 —
// 이 시간이 지나면 무조건 recorder를 멈춘다.
const AI_AUDIO_STOP_SAFETY_TIMEOUT_MS = 8_000;

// AI 오디오 자동 재생용 <audio> 엘리먼트를 "언락"하기 위한 무음 WAV.
// 브라우저의 autoplay 정책상 play()는 유저 제스처(클릭 등)와 동기적으로
// 묶여 있을 때만 허용되는데, 우리 재생은 STT 완료 이벤트 콜백 안에서
// 비동기로 호출돼 제스처와 완전히 분리돼 있어 재생이 조용히 막혔었음
// (에러도 안 뜨고 그냥 소리만 안 남). "마이크 시작" 버튼 클릭(실제
// 제스처) 시점에 이 무음 오디오로 미리 한 번 play()를 성공시켜 엘리먼트를
// 언락해두고, 이후 실제 응답 오디오는 그 엘리먼트의 src만 바꿔 재사용한다.
const SILENT_AUDIO_DATA_URI =
  "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=";

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

export type ConnectionStatus = "idle" | "connecting" | "connected" | "failed";

// OpenAI Realtime API가 보내는 서버 이벤트 중 우리가 실제로 다루는 것만 부분
// 타이핑함 — 공식 TS 타입 패키지 없이 raw WebRTC로 붙기 때문에 전체 이벤트
// 스키마를 다 선언하지 않고, 우리가 쓰는 필드만 명시하고 나머지는
// unknown으로 열어둠(any 대신).
interface RealtimeServerEvent {
  type: string;
  transcript?: string;
  delta?: string;
  [key: string]: unknown;
}

function buildSessionInstructions(topic: TopicDetail): string {
  const scenario = topic.paragraphs
    .map((paragraph) => paragraph.translations.eng)
    .filter((text): text is string => Boolean(text))
    .join(" ");

  return [
    "You are Ringle's AI English tutor having a spoken conversation with a Korean learner of English.",
    `Topic: "${topic.title_en}".`,
    scenario && `Scenario: ${scenario}`,
    "Stay focused on this topic for the entire conversation, gently steering back if the learner drifts.",
    "Speak only in English, at a natural but learner-friendly pace, and keep each response short (1-3 sentences) so the learner has room to speak.",
    "This is a natural conversation, not a drilling exercise: don't ask the learner to repeat sentences back to you, recite full sentences, or say something 'all together' — just respond naturally to what they said and move the conversation forward with a new question or reaction.",
  ]
    .filter(Boolean)
    .join(" ");
}

const GREETING_RESPONSE_INSTRUCTIONS =
  "Greet the learner with a brief, friendly opening line that introduces today's topic and invites them to start.";

interface UseRealtimeConversationResult {
  status: ConnectionStatus;
  errorMessage: string | null;
  messages: ConversationMessage[];
  isRecording: boolean;
  isAiResponding: boolean;
  // 0(무음)~1(최대) 사이의 실시간 마이크 입력 레벨 — waveform을 실제 음성
  // 입력에 반응하게(인터랙티브하게) 그리기 위한 값. 녹음 중이 아닐 땐 0.
  audioLevel: number;
  startRecording: () => Promise<void>;
  finishAnswer: () => void;
  // 자동 재시도가 다 소진돼 status가 "failed"가 됐을 때, 유저가 수동으로
  // 처음부터 다시 연결을 시도하게 하는 함수.
  reconnect: () => void;
  // 대화 기록을 비우고 완전히 새 세션으로 다시 시작하는 함수("다시
  // 시작하기" 버튼용) — reconnect와 달리 메시지 목록도 초기화됨.
  restart: () => void;
  // 이번 세션에서 실제로 소비한 턴 수 / 허용 최대치 — UI에 "n/20"처럼
  // 진행 상황을 보여주기 위해 노출.
  turnCount: number;
  maxTurns: number;
  // MAX_TURNS에 도달해 더 이상 마이크를 시작할 수 없는 상태인지.
  turnLimitReached: boolean;
  // 이번 턴에서 60초 제한까지 남은 초 — 녹음 중이 아닐 땐 의미 없음(무시).
  recordingSecondsLeft: number;
}

// 대화 화면의 WebRTC 연결/이벤트 처리를 캡슐화하는 훅. StudyDetailPage는
// 이 훅이 돌려주는 상태/메시지만 렌더링하면 됨.
export function useRealtimeConversation(
  topic: TopicDetail | null,
  initialMessages: ConversationMessage[],
  voice?: string,
): UseRealtimeConversationResult {
  const [status, setStatus] = useState<ConnectionStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [messages, setMessages] = useState<ConversationMessage[]>(initialMessages);
  const [isRecording, setIsRecording] = useState(false);
  const [isAiResponding, setIsAiResponding] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  // 재연결 시도 트리거 — reconnect()가 이 값을 바꿔서 연결 useEffect를
  // 강제로 다시 실행시킴.
  const [connectionAttempt, setConnectionAttempt] = useState(0);
  // 이번 세션에서 실제로 응답을 요청한 턴 수(무음으로 끝난 턴은 카운트하지
  // 않음 — finishAnswer의 speechDetectedRef 분기 참고).
  const [turnCount, setTurnCount] = useState(0);
  const turnLimitReached = turnCount >= MAX_TURNS;
  const [recordingSecondsLeft, setRecordingSecondsLeft] = useState(MAX_RECORDING_MS / 1000);

  // 재연결 시 "이미 대화가 진행 중이었는지"를 판단하는 기준 — initialMessages
  // prop은 훅 최초 호출 시점에 고정되므로, 재연결 시점까지 쌓인 실제 메시지
  // 수를 반영하려면 별도로 추적해야 함(그래야 재연결할 때 인사말이 중복으로
  // 다시 나가지 않음).
  const messagesCountRef = useRef(initialMessages.length);
  // WebRTC 세션(=서버 쪽 realtime conversation)은 연결마다 완전히
  // 새로 만들어져서, 재방문/재연결 시 화면엔 이전 대화가 남아있어도
  // 모델은 그 내용을 전혀 모름. dc가 열릴 때 이 ref의 내용을
  // conversation.item.create로 재생시켜 모델에도 같은 맥락을 심어준다
  // (아래 dc "open" 핸들러 참고). state를 직접 못 읽으므로 effect로 동기화.
  const messagesRef = useRef<ConversationMessage[]>(initialMessages);
  const reconnectAttemptRef = useRef(0);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const dcRef = useRef<RTCDataChannel | null>(null);
  // 마이크 오디오를 실어 보내는 sender — 세션 내내 유지되고, 실제 트랙은
  // 마이크 시작/답변완료 때마다 replaceTrack으로 붙였다 뗀다(재협상 불필요).
  const senderRef = useRef<RTCRtpSender | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  // 레벨 미터(AnalyserNode)/로컬 녹음(다시 듣기용 MediaRecorder)이 쓰는
  // 트랙 — 원본 마이크 트랙을 그대로 안 쓰고 clone해서 씀. 원본은 VAD가
  // `enabled`를 껐다 켰다 하는데, 그건 그 트랙을 쓰는 모든 소비자를 다
  // 무음으로 만들어버리는 스펙 동작이라(WebRTC 전송뿐 아니라 로컬
  // AnalyserNode/MediaRecorder까지) 그대로 쓰면 한 번 꺼진 뒤 레벨이 다시
  // 안 올라와서 영원히 안 켜지는 데드락이 생김 — 그래서 게이팅 대상(원본)과
  // 로컬 모니터링 대상(clone)을 분리함.
  const monitorTrackRef = useRef<MediaStreamTrack | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  // remote 트랙 디코딩을 계속 활성 상태로 유지하기 위한 muted sink(위
  // pc.ontrack 주석 참고) — 연결이 끊길 때 같이 정리해야 함.
  const remoteStreamSinkRef = useRef<HTMLAudioElement | null>(null);

  const userRecorderRef = useRef<MediaRecorder | null>(null);
  // 녹음 종료 시점엔 아직 인코딩이 안 끝났을 수 있어 Promise로 들고 있다가,
  // transcript 이벤트가 왔을 때 그 시점에 캡처한 Promise를 기다려 붙임
  // (다음 턴이 먼저 시작돼 ref가 덮어써져도 안전).
  const pendingUserAudioRef = useRef<Promise<string> | null>(null);
  // "답변완료" 시점에 유저 메시지 자리를 먼저 만들어두고(placeholder), STT
  // 결과가 오면 그 자리를 채워넣기 위한 id. response.create보다 먼저
  // appendMessage하기 때문에, 서버에서 "AI 응답" 이벤트가 "유저 발화 STT
  // 완료" 이벤트보다 먼저 도착해도(실제로 종종 그럼) 메시지 목록 순서는
  // 항상 유저→AI로 유지됨 — 예전엔 이벤트 도착 순서 그대로 붙이다 보니
  // AI 답변이 유저 자신의 말풍선보다 먼저 뜨는 순서 역전이 있었음.
  const pendingUserMessageIdRef = useRef<string | null>(null);
  // 유저 STT 결과가 아직 안 왔는데 AI 응답 텍스트를 바로바로 화면에
  // 스트리밍해버리면, "텍스트로 변환하는 중..."이 떠 있는 도중에 AI 답변이
  // 먼저 보이는 어색한 UX가 됨(오디오는 실시간이라 못 늦추지만, 텍스트는
  // 늦출 수 있음). 유저 텍스트가 확정될 때까지 AI 텍스트 반영을 미뤄두기
  // 위한 플래그.
  const awaitingUserTranscriptRef = useRef(false);
  // response.created마다 항상 채워지는, 지금 버퍼링 중인 AI 메시지의 id.
  // response.done이 오면 currentAiMessageIdRef는 null로 리셋되니, 나중에
  // 공개할 때 어느 메시지인지 알기 위해 별도로 들고 있음.
  const bufferedAiMessageIdRef = useRef<string | null>(null);
  // 텍스트 공개와 오디오 재생을 "동시에" 트리거하기 위한 게이트 상태.
  // 처음엔 유저 텍스트 확정 여부로만 텍스트를 지연시키고 오디오는 녹음이
  // 끝나는 대로(보통 훨씬 늦게, 응답 전체 길이만큼 뒤에) 따로 재생했는데,
  // 유저 발화를 기다리지 않는 응답(첫 인사말 등)은 텍스트가 버퍼링 대상이
  // 아니라서 텍스트만 먼저 뜨고 목소리가 한참 뒤에 나오는 어긋남이 있었음.
  // 그래서 모든 응답의 텍스트 공개를 "유저 텍스트 확정(해당 없으면 통과)"
  // + "AI 응답 생성 완료(response.done)" + "오디오 녹음 완료" 세 조건이
  // 모두 갖춰질 때까지 미루고, 그 순간 텍스트 공개와 오디오 재생을 함께
  // 트리거한다(tryRevealAiTurn 참고).
  const aiResponseDoneRef = useRef(false);
  // 이번 응답의 오디오 recorder가 아직 돌고 있는지 — true인 동안은
  // tryRevealAiTurn이 공개를 보류한다. 오디오 트랙이 아예 없어 recorder가
  // 시작조차 안 됐으면 계속 false로 남아, "기다릴 오디오가 없다"로 취급됨.
  const aiAudioRecordingInProgressRef = useRef(false);
  // 재생 준비가 끝난 오디오 URL — 공개 시점에 이게 있으면 같이 재생한다.
  const readyAiAudioUrlRef = useRef<string | null>(null);
  // 마이크 시작 버튼 클릭 시 언락해두는 재생용 엘리먼트(SILENT_AUDIO_DATA_URI
  // 참고) — 없으면(언락 전이면) 새 Audio를 만들어 재생을 시도는 하되,
  // autoplay 정책에 막힐 수 있음.
  const aiPlaybackAudioRef = useRef<HTMLAudioElement | null>(null);

  const aiRecorderRef = useRef<MediaRecorder | null>(null);
  const currentAiMessageIdRef = useRef<string | null>(null);
  const currentAiTextRef = useRef("");

  const recordingTimeoutRef = useRef<number | null>(null);
  // 위 recordingTimeoutRef와 별개로, UI에 남은 초를 1초 간격으로 보여주기
  // 위한 타이머 — 실제 답변완료 처리는 recordingTimeoutRef가 담당하고
  // 이건 순전히 표시용.
  const recordingIntervalRef = useRef<number | null>(null);
  // getUserMedia가 비동기라 isRecording state가 반영되기 전에 마이크
  // 버튼이 빠르게 두 번 눌리는 걸 막기 위한 락.
  const isStartingRecordingRef = useRef(false);

  // 마이크 입력 레벨을 실시간으로 측정하기 위한 Web Audio API 자원.
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const levelAnimationFrameRef = useRef<number | null>(null);

  // 클라이언트 VAD(마이크 게이팅)용 — 현재 턴에서 전송 중인 실제 트랙,
  // 마지막으로 음성이 감지된 시각, 이번 턴에 서버가 발화를 확인해줬는지.
  const activeMicTrackRef = useRef<MediaStreamTrack | null>(null);
  const lastVoiceAtRef = useRef(0);
  const speechDetectedRef = useRef(false);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  const stopLevelMeter = useCallback(() => {
    if (levelAnimationFrameRef.current !== null) {
      cancelAnimationFrame(levelAnimationFrameRef.current);
      levelAnimationFrameRef.current = null;
    }
    analyserRef.current = null;
    void audioContextRef.current?.close();
    audioContextRef.current = null;
    setAudioLevel(0);
  }, []);

  const startLevelMeter = useCallback((stream: MediaStream) => {
    const audioContext = new AudioContext();
    audioContextRef.current = audioContext;
    const source = audioContext.createMediaStreamSource(stream);
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 256;
    analyser.smoothingTimeConstant = 0.6;
    source.connect(analyser);
    analyserRef.current = analyser;

    const data = new Uint8Array(analyser.frequencyBinCount);
    const tick = () => {
      analyser.getByteFrequencyData(data);
      const average = data.reduce((sum, value) => sum + value, 0) / data.length;
      const level = average / 255;
      setAudioLevel(level);

      // 클라이언트 VAD: 실제 음성일 때만 트랙을 켜서 보내고, 짧은 침묵은
      // hangover 동안 유지했다가 끈다 — 무음 구간이 그대로 전송되지 않게 함.
      const track = activeMicTrackRef.current;
      if (track) {
        const now = performance.now();
        if (level > VOICE_LEVEL_THRESHOLD) {
          lastVoiceAtRef.current = now;
          track.enabled = true;
          // 서버 VAD를 꺼놨기 때문에(turn_detection: null) 이번 턴에 발화가
          // 있었는지는 서버 이벤트가 아니라 클라이언트가 직접 판단해야 함 —
          // 여기서 임계값을 넘는 순간 기록.
          speechDetectedRef.current = true;
        } else if (now - lastVoiceAtRef.current > VOICE_HANGOVER_MS) {
          track.enabled = false;
        }
      }

      levelAnimationFrameRef.current = requestAnimationFrame(tick);
    };
    tick();
  }, []);

  const appendMessage = useCallback((message: ConversationMessage) => {
    setMessages((prev) => {
      const next = [...prev, message];
      messagesCountRef.current = next.length;
      return next;
    });
  }, []);

  const updateMessageText = useCallback((id: string | null, text: string) => {
    if (!id) return;
    setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, text } : m)));
  }, []);

  const attachAudioUrl = useCallback((id: string | null, audioUrl: string) => {
    if (!id) return;
    setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, audioUrl } : m)));
  }, []);

  const playAiAudio = useCallback((audioUrl: string) => {
    const audio = aiPlaybackAudioRef.current ?? new Audio();
    audio.src = audioUrl;
    audio.play().catch((err: unknown) => {
      // eslint-disable-next-line no-console
      console.error("[realtime] AI 오디오 자동 재생 실패", err);
    });
  }, []);

  // "마이크 시작" 버튼 클릭(실제 유저 제스처) 시점에 무음 오디오로
  // play()를 한 번 성공시켜, 이후 STT 완료 콜백 등 비동기 시점에 같은
  // 엘리먼트로 재생을 시도해도 브라우저 autoplay 정책에 막히지 않게 한다.
  const unlockAiPlaybackAudio = useCallback(() => {
    if (aiPlaybackAudioRef.current) return;
    const audio = new Audio(SILENT_AUDIO_DATA_URI);
    audio.play().catch(() => {
      // 언락 자체가 실패해도(예: 이 클릭도 충분한 제스처로 안 쳐주는 환경)
      // 이후 playAiAudio에서 새 Audio로 재시도하므로 조용히 무시.
    });
    aiPlaybackAudioRef.current = audio;
  }, []);

  // 텍스트 공개와 오디오 재생을 같은 순간에 함께 트리거하기 위한 게이트.
  // "유저 텍스트 확정" / "AI 응답 생성 완료" / "오디오 녹음 완료" 세
  // 이벤트가 각자 다른 시점에 비동기로 도착하므로, 셋 다 호출하는 자리에서
  // 매번 이 함수를 불러 조건이 갖춰졌는지 확인한다(순서와 무관하게 마지막
  // 조건이 채워지는 순간 한 번만 공개됨).
  const tryRevealAiTurn = useCallback(
    (id: string) => {
      if (awaitingUserTranscriptRef.current) return;
      if (!aiResponseDoneRef.current) return;
      if (aiAudioRecordingInProgressRef.current) return;

      if (bufferedAiMessageIdRef.current === id) {
        updateMessageText(id, currentAiTextRef.current);
        bufferedAiMessageIdRef.current = null;
      }
      if (readyAiAudioUrlRef.current) {
        playAiAudio(readyAiAudioUrlRef.current);
        readyAiAudioUrlRef.current = null;
      }
    },
    [playAiAudio, updateMessageText],
  );

  const translateAndAttach = useCallback(async (id: string, text: string) => {
    if (!text.trim()) return;
    try {
      const { translation } = await translationsApi.translate(text);
      setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, translation } : m)));
    } catch {
      // 번역 실패는 대화 자체를 막을 정도로 치명적이지 않으므로 조용히 무시.
    }
  }, []);

  const startAiAudioRecording = useCallback(
    (messageId: string) => {
      const remoteStream = remoteStreamRef.current;
      if (!remoteStream || remoteStream.getAudioTracks().length === 0) return;

      const chunks: BlobPart[] = [];
      const recorder = new MediaRecorder(remoteStream);
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };
      recorder.onstop = () => {
        // messageId를 클로저로 직접 캡처 — response.done 처리 시점엔
        // currentAiMessageIdRef가 이미 null로 초기화돼 있어서 그때 다시
        // 읽으면 안 됨(예전엔 이 ref를 여기서 읽어서 항상 null이 붙는
        // 버그가 있었음).
        const blob = new Blob(chunks, { type: recorder.mimeType });
        void blobToDataUrl(blob).then((audioUrl) => {
          attachAudioUrl(messageId, audioUrl);
          readyAiAudioUrlRef.current = audioUrl;
          aiAudioRecordingInProgressRef.current = false;
          tryRevealAiTurn(messageId);
        });
      };
      recorder.start();
      aiAudioRecordingInProgressRef.current = true;
      aiRecorderRef.current = recorder;
    },
    [attachAudioUrl, tryRevealAiTurn],
  );

  // response.done은 데이터 채널로 오는 "생성 완료" 신호일 뿐, 실제 오디오는
  // 별도 미디어 트랙으로 흘러들어오기 때문에 바로 recorder.stop()하면 마지막
  // 부분이 잘릴 수 있음. 마이크 쪽 VAD와 같은 방식(AnalyserNode로 실시간
  // 볼륨 측정)을 AI 오디오 트랙에도 적용해서, 실제로 소리가 잦아들 때까지
  // 기다렸다가 멈춘다 — 고정 딜레이보다 네트워크 상황에 적응적으로 대응됨.
  const stopAiRecorderWhenSilent = useCallback((recorder: MediaRecorder, remoteStream: MediaStream) => {
    if (remoteStream.getAudioTracks().length === 0) {
      recorder.stop();
      return;
    }

    const audioContext = new AudioContext();
    const source = audioContext.createMediaStreamSource(remoteStream);
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 256;
    source.connect(analyser);
    const data = new Uint8Array(analyser.frequencyBinCount);

    const startedAt = performance.now();
    let lastLoudAt = performance.now();
    let frameId: number;

    const finish = () => {
      cancelAnimationFrame(frameId);
      void audioContext.close();
      recorder.stop();
    };

    const tick = () => {
      analyser.getByteFrequencyData(data);
      const average = data.reduce((sum, value) => sum + value, 0) / data.length;
      const level = average / 255;
      const now = performance.now();
      if (level > VOICE_LEVEL_THRESHOLD) lastLoudAt = now;

      if (
        now - lastLoudAt > AI_AUDIO_SILENCE_HANGOVER_MS ||
        now - startedAt > AI_AUDIO_STOP_SAFETY_TIMEOUT_MS
      ) {
        finish();
        return;
      }
      frameId = requestAnimationFrame(tick);
    };
    frameId = requestAnimationFrame(tick);
  }, []);

  const handleServerEvent = useCallback(
    (event: RealtimeServerEvent) => {
      switch (event.type) {
        // "input_audio_buffer.speech_started"는 server_vad가 켜져 있을
        // 때만 오는 이벤트라 여기선 안 옴(turn_detection: null) — 발화
        // 감지는 레벨 미터의 tick()에서 클라이언트가 직접 함.
        case "conversation.item.input_audio_transcription.completed": {
          const text = event.transcript ?? "";
          const audioPromise = pendingUserAudioRef.current;
          pendingUserAudioRef.current = null;
          // finishAnswer()에서 미리 만들어둔 placeholder 자리를 채움 — 새로
          // appendMessage하지 않음(순서 보장을 위해 placeholder를 먼저
          // 만들어뒀으니, 여기서 또 새 메시지를 만들면 안 됨).
          const id = pendingUserMessageIdRef.current;
          pendingUserMessageIdRef.current = null;
          if (!id) break;
          updateMessageText(id, text);
          void translateAndAttach(id, text);
          if (audioPromise) {
            void audioPromise.then((audioUrl) => attachAudioUrl(id, audioUrl));
          }

          // 유저 텍스트가 이제 확정됐으니, 대기 중이던 AI 응답(텍스트+오디오)이
          // 있으면 공개를 시도함 — 응답 생성/오디오 녹음이 아직 안 끝났으면
          // tryRevealAiTurn이 조용히 보류하고, response.done/오디오 녹음
          // 완료 시점에 다시 시도됨. 이후 델타는 평소처럼 바로바로
          // 반영됨(awaitingUserTranscriptRef가 꺼졌으니).
          awaitingUserTranscriptRef.current = false;
          if (bufferedAiMessageIdRef.current) {
            tryRevealAiTurn(bufferedAiMessageIdRef.current);
          }
          break;
        }
        case "response.created": {
          const id = crypto.randomUUID();
          currentAiMessageIdRef.current = id;
          currentAiTextRef.current = "";
          aiResponseDoneRef.current = false;
          aiAudioRecordingInProgressRef.current = false;
          readyAiAudioUrlRef.current = null;
          // 텍스트를 델타가 오는 대로 바로바로 보여주지 않고, 이 메시지를
          // 항상 버퍼링 대상으로 등록해둠 — 첫 인사말(유저 발화를 기다리는
          // 중이 아닌 응답)도 텍스트만 먼저 뜨고 오디오가 한참 뒤에
          // 나오면 어색하므로, 모든 응답이 tryRevealAiTurn을 통해 텍스트+
          // 오디오를 같이 공개하도록 통일함.
          bufferedAiMessageIdRef.current = id;
          setIsAiResponding(true);
          appendMessage({ id, role: "assistant", text: "" });
          startAiAudioRecording(id);
          break;
        }
        case "response.output_audio_transcript.delta": {
          // 화면엔 반영 안 하고 누적만 함 — tryRevealAiTurn이 조건 충족
          // 시점에 한꺼번에 공개함.
          currentAiTextRef.current += event.delta ?? "";
          break;
        }
        case "response.done": {
          const id = currentAiMessageIdRef.current;
          setIsAiResponding(false);
          aiResponseDoneRef.current = true;
          // recorder/remoteStream을 클로저로 캡처해서, 무음 감지 도중 다음
          // 턴이 시작돼 aiRecorderRef.current가 새 recorder로 바뀌어도 이
          // 감지는 원래 것만 정확히 멈춘다.
          const recorder = aiRecorderRef.current;
          const remoteStream = remoteStreamRef.current;
          aiRecorderRef.current = null;
          if (recorder && remoteStream) {
            stopAiRecorderWhenSilent(recorder, remoteStream);
          } else {
            recorder?.stop();
            aiAudioRecordingInProgressRef.current = false;
          }
          if (id && currentAiTextRef.current.trim()) {
            void translateAndAttach(id, currentAiTextRef.current);
          }
          if (id) {
            tryRevealAiTurn(id);
          }
          currentAiMessageIdRef.current = null;
          break;
        }
        case "error": {
          // event 객체를 그대로 찍으면 콘솔에 접힌 "Object"로만 보여서
          // 실제 code/message를 확인하려면 매번 펼쳐야 함 — 문자열로
          // 직렬화해서 로그 한 줄에 원인이 바로 보이게 함.
          // eslint-disable-next-line no-console
          console.error("[realtime] server error event", JSON.stringify(event));
          setErrorMessage("대화 중 오류가 발생했습니다. 다시 시도해주세요.");
          setIsAiResponding(false);
          break;
        }
        default:
          // eslint-disable-next-line no-console
          console.debug("[realtime] event", event);
          break;
      }
    },
    [
      appendMessage,
      attachAudioUrl,
      startAiAudioRecording,
      stopAiRecorderWhenSilent,
      translateAndAttach,
      tryRevealAiTurn,
      updateMessageText,
    ],
  );

  useEffect(() => {
    if (!topic) return;

    let cancelled = false;
    let retryTimeoutId: number | null = null;
    reconnectAttemptRef.current = 0;
    setStatus("connecting");
    setErrorMessage(null);
    // 새 세션(최초 연결이든 수동 재연결이든)이 시작되면 턴 카운트도 새로
    // 시작 — 재연결은 오남용 우회 수단이 아니라 네트워크 복구 수단이므로,
    // 여기서 리셋하는 게 재연결 기능의 원래 목적과 맞음.
    setTurnCount(0);

    const cleanupConnection = () => {
      if (recordingTimeoutRef.current) {
        window.clearTimeout(recordingTimeoutRef.current);
        recordingTimeoutRef.current = null;
      }
      if (recordingIntervalRef.current) {
        window.clearInterval(recordingIntervalRef.current);
        recordingIntervalRef.current = null;
      }
      stopLevelMeter();
      userRecorderRef.current?.stop();
      aiRecorderRef.current?.stop();
      micStreamRef.current?.getTracks().forEach((track) => track.stop());
      micStreamRef.current = null;
      monitorTrackRef.current?.stop();
      monitorTrackRef.current = null;
      remoteStreamSinkRef.current?.pause();
      remoteStreamSinkRef.current = null;
      dcRef.current?.close();
      pcRef.current?.close();
    };

    // 초기 연결이든 끊긴 뒤든, 실패하면 여기로 모여서 재시도 여부를 결정함.
    const handleConnectionFailure = (message: string) => {
      if (cancelled) return;
      setIsRecording(false);
      setIsAiResponding(false);
      cleanupConnection();

      if (reconnectAttemptRef.current >= MAX_RECONNECT_ATTEMPTS) {
        setStatus("failed");
        setErrorMessage(message);
        return;
      }

      reconnectAttemptRef.current += 1;
      const attempt = reconnectAttemptRef.current;
      setStatus("connecting");
      setErrorMessage(`${message} 재연결 시도 중... (${attempt}/${MAX_RECONNECT_ATTEMPTS})`);

      const delay = RECONNECT_BASE_DELAY_MS * 2 ** (attempt - 1);
      retryTimeoutId = window.setTimeout(() => {
        if (!cancelled) void connect();
      }, delay);
    };

    const connect = async () => {
      try {
        const session = await realtimeSessionsApi.create(voice);
        if (cancelled) return;

        const pc = new RTCPeerConnection();
        pcRef.current = pc;

        // 연결이 정상적으로 맺어진 뒤 네트워크가 끊기는 경우("failed"/
        // "closed")를 감지해서 자동 재연결을 트리거함 — "disconnected"는
        // ICE가 스스로 복구하는 경우가 많아 여기선 최종 실패로 보지 않음.
        pc.onconnectionstatechange = () => {
          if (cancelled) return;
          if (pc.connectionState === "failed" || pc.connectionState === "closed") {
            handleConnectionFailure("네트워크 연결이 끊겼습니다.");
          }
        };

        const remoteStream = new MediaStream();
        remoteStreamRef.current = remoteStream;
        // 유저에게는 실시간으로 바로 들려주지 않음(예전엔 <audio autoplay>로
        // 라이브 재생했음) — 그러면 유저 자신의 텍스트가 아직 확정되기도
        // 전에 AI 목소리부터 들려서 "나 → 상대" 순서가 깨짐. 대신
        // startAiAudioRecording이 이 트랙을 녹음해서 응답 전체가 끝난
        // 뒤(+유저 텍스트 확정 뒤) 완성된 클립을 텍스트 공개와 동시에
        // 재생함(tryRevealAiTurn 참고).
        // 다만 muted sink 엘리먼트는 여전히 필요함 — 아무 데도 렌더링을
        // 안 붙이면(srcObject를 아무 데도 안 걸면) 브라우저가 remote 트랙을
        // 실제로 디코딩하지 않아서 MediaRecorder가 빈/깨진 blob을 만들고,
        // 나중에 재생 시 "NotSupportedError: no supported source"로 실패함.
        // muted=true라 소리는 안 나가지만 디코딩 파이프라인은 계속 돌게 함.
        const sinkAudioEl = new Audio();
        sinkAudioEl.muted = true;
        sinkAudioEl.srcObject = remoteStream;
        void sinkAudioEl.play().catch(() => {});
        remoteStreamSinkRef.current = sinkAudioEl;
        pc.ontrack = (e) => {
          e.streams[0]?.getTracks().forEach((track) => remoteStream.addTrack(track));
        };

        // 연결 시점에는 마이크를 아예 얻지 않음 — audio transceiver만 미리
        // 만들어서 SDP에 m=audio 라인을 확보해두고, 실제 트랙은 "마이크
        // 시작"을 눌렀을 때만 getUserMedia로 얻어 replaceTrack으로 붙인다.
        // 이렇게 해야 녹음 중이 아닐 때는 마이크 하드웨어 자체가 꺼져 있음
        // (enabled=false로 mute만 하는 방식은 하드웨어는 계속 켜진 채라 부족).
        const transceiver = pc.addTransceiver("audio", { direction: "sendrecv" });
        senderRef.current = transceiver.sender;

        const dc = pc.createDataChannel("oai-events");
        dcRef.current = dc;

        dc.addEventListener("open", () => {
          if (cancelled) return;
          reconnectAttemptRef.current = 0;
          dc.send(
            JSON.stringify({
              type: "session.update",
              session: {
                type: "realtime",
                instructions: buildSessionInstructions(topic),
                audio: {
                  input: {
                    // server_vad는 끔(null) — create_response:false를 써도
                    // "응답 자동 생성"만 막힐 뿐, server_vad 자체의 나머지
                    // 동작(침묵 감지 → input_audio_buffer 자동 커밋 →
                    // conversation item 생성)은 그대로 살아있어서, 유저가
                    // 문장 중간에 잠깐만 쉬어도 "답변완료"를 누르기 전에
                    // 서버가 멋대로 그 시점까지의 오디오를 커밋해 텍스트를
                    // 만들어버리는 문제가 있었음(OpenAI 공식 문서로 확인:
                    // "retain all the behavior of VAD but not automatically
                    // create new Responses"). 발화 경계는 전적으로
                    // "답변완료" 버튼(과 60초 안전장치)만으로 결정하도록
                    // 서버 VAD를 완전히 비활성화 — 무음 구간 제거는
                    // 클라이언트 VAD(레벨 미터의 track.enabled 게이팅)만으로
                    // 계속 수행함.
                    turn_detection: null,
                    // language를 명시하지 않으면 Whisper가 자동으로 언어를
                    // 감지하는데, 한국인 억양의 영어 발화나 고유명사(회사명
                    // 등)가 섞이면 가끔 한국어로 잘못 감지해서 STT 결과
                    // 자체가 한국어로 나오는 문제가 있었음. 이 앱은 항상
                    // "한국인이 영어로 말하는" 상황만 다루므로 감지에 맡기지
                    // 않고 영어로 고정.
                    transcription: { model: "whisper-1", language: "en" },
                  },
                },
              },
            }),
          );
          setStatus("connected");
          setErrorMessage(null);

          // 이번 WebRTC 세션(=서버 쪽 realtime conversation)은 매번 새로
          // 만들어져서, 재방문/재연결 전 대화가 남아있어도 모델은 모름.
          // 화면에 남아있는(=text가 채워진) 과거 메시지를 그대로 재생시켜
          // 모델에도 같은 맥락을 심어준다 — 응답을 새로 트리거하진 않고
          // 대화 아이템만 추가함(conversation.item.create는 response를
          // 만들지 않음).
          const history = messagesRef.current.filter((message) => message.text !== "");
          for (const message of history) {
            dc.send(
              JSON.stringify({
                type: "conversation.item.create",
                item: {
                  type: "message",
                  role: message.role,
                  content: [
                    message.role === "user"
                      ? { type: "input_text", text: message.text }
                      : { type: "text", text: message.text },
                  ],
                },
              }),
            );
          }

          if (messagesCountRef.current === 0) {
            // response.instructions는 세션 instructions에 더해지는 게
            // 아니라 그 턴만 통째로 대체하는 것으로 보여서, 토픽 정보를
            // 여기서도 다시 포함시켜야 AI가 실제 토픽을 알고 인사말을 만듦.
            dc.send(
              JSON.stringify({
                type: "response.create",
                response: {
                  instructions: `${buildSessionInstructions(topic)} ${GREETING_RESPONSE_INSTRUCTIONS}`,
                },
              }),
            );
          }
        });

        // 정상 연결 후 data channel이 끊기는 경우의 보조 신호(연결 상태
        // 이벤트보다 먼저/대신 발생할 수 있음).
        dc.addEventListener("close", () => handleConnectionFailure("네트워크 연결이 끊겼습니다."));

        dc.addEventListener("message", (e) => {
          try {
            handleServerEvent(JSON.parse(e.data));
          } catch {
            // 파싱 실패한 이벤트는 무시.
          }
        });

        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        const sdpResponse = await fetch(REALTIME_CALLS_URL, {
          method: "POST",
          body: offer.sdp,
          headers: {
            Authorization: `Bearer ${session.client_secret}`,
            "Content-Type": "application/sdp",
          },
        });

        if (!sdpResponse.ok) {
          throw new Error("realtime calls sdp exchange failed");
        }

        await pc.setRemoteDescription({ type: "answer", sdp: await sdpResponse.text() });
      } catch (err) {
        if (cancelled) return;

        if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
          // 로그인/권한 문제는 재시도해도 똑같이 실패하니 바로 최종 실패로.
          setStatus("failed");
          setErrorMessage(err.message);
          return;
        }

        const message =
          err instanceof ApiError ? err.message : "AI와 연결하지 못했습니다. 네트워크 상태를 확인해주세요.";
        handleConnectionFailure(message);
      }
    };

    void connect();

    return () => {
      cancelled = true;
      if (retryTimeoutId !== null) window.clearTimeout(retryTimeoutId);
      cleanupConnection();
    };
    // topic.id가 바뀌거나 connectionAttempt가 바뀌면(수동 재연결) 새
    // 세션으로 다시 연결 — topic 객체 참조 자체가 매 렌더마다 바뀔 수
    // 있어 id만 의존성으로 둠.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topic?.id, connectionAttempt]);

  const reconnect = useCallback(() => {
    setConnectionAttempt((n) => n + 1);
  }, []);

  // reconnect()와 달리 대화 기록 자체를 비우고 완전히 새 세션으로 시작 —
  // messagesCountRef를 0으로 되돌려야 새 세션이 열렸을 때 인사말이 다시
  // 트리거됨(재연결 때는 반대로 이 값을 건드리지 않아 인사말이 중복되지
  // 않게 했던 것과 대비됨).
  const restart = useCallback(() => {
    setMessages([]);
    messagesCountRef.current = 0;
    setConnectionAttempt((n) => n + 1);
  }, []);

  const finishAnswer = useCallback(() => {
    if (recordingTimeoutRef.current) {
      window.clearTimeout(recordingTimeoutRef.current);
      recordingTimeoutRef.current = null;
    }
    if (recordingIntervalRef.current) {
      window.clearInterval(recordingIntervalRef.current);
      recordingIntervalRef.current = null;
    }
    setRecordingSecondsLeft(MAX_RECORDING_MS / 1000);

    setIsRecording(false);
    stopLevelMeter();
    activeMicTrackRef.current = null;

    userRecorderRef.current?.stop();
    userRecorderRef.current = null;

    // 마이크를 완전히 놓아줌 — sender에서 트랙을 떼고 트랙 자체도 stop()해서
    // 브라우저 마이크 사용 표시등이 꺼지도록 함(단순 mute와 다름).
    void senderRef.current?.replaceTrack(null);
    micStreamRef.current?.getTracks().forEach((track) => track.stop());
    micStreamRef.current = null;
    monitorTrackRef.current?.stop();
    monitorTrackRef.current = null;

    if (speechDetectedRef.current) {
      // response.create를 보내기 전에 유저 메시지 자리부터 먼저 만들어둠
      // (pendingUserMessageIdRef 선언부 주석 참고) — AI 응답 이벤트가 STT
      // 완료 이벤트보다 먼저 도착해도 메시지 목록 순서가 항상 유저→AI로
      // 유지되게 하기 위함.
      const id = crypto.randomUUID();
      pendingUserMessageIdRef.current = id;
      awaitingUserTranscriptRef.current = true;
      appendMessage({ id, role: "user", text: "" });

      dcRef.current?.send(JSON.stringify({ type: "input_audio_buffer.commit" }));
      dcRef.current?.send(JSON.stringify({ type: "response.create" }));
      setTurnCount((n) => n + 1);
    } else {
      // 이번 턴에 발화가 한 번도 감지되지 않았으면(그냥 무음이었으면) 커밋/
      // 응답 요청 자체를 만들지 않고 버퍼만 비움 — 불필요한 토큰 낭비 방지.
      dcRef.current?.send(JSON.stringify({ type: "input_audio_buffer.clear" }));
    }
  }, [appendMessage, stopLevelMeter]);

  const startRecording = useCallback(async () => {
    const sender = senderRef.current;
    if (
      !sender ||
      status !== "connected" ||
      isAiResponding ||
      isRecording ||
      isStartingRecordingRef.current ||
      turnLimitReached
    ) {
      return;
    }
    isStartingRecordingRef.current = true;
    unlockAiPlaybackAudio();

    let micStream: MediaStream;
    try {
      micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setErrorMessage("마이크 권한이 필요합니다. 브라우저 설정에서 마이크 접근을 허용해주세요.");
      isStartingRecordingRef.current = false;
      return;
    }

    micStreamRef.current = micStream;
    const micTrack = micStream.getAudioTracks()[0];
    activeMicTrackRef.current = micTrack;
    lastVoiceAtRef.current = performance.now();
    speechDetectedRef.current = false;
    await sender.replaceTrack(micTrack);

    // 레벨 미터/로컬 녹음은 게이팅 대상인 원본 트랙이 아니라 별도 clone을
    // 씀(위 monitorTrackRef 선언부 주석 참고).
    const monitorTrack = micTrack.clone();
    monitorTrackRef.current = monitorTrack;
    const monitorStream = new MediaStream([monitorTrack]);
    startLevelMeter(monitorStream);
    isStartingRecordingRef.current = false;

    // 실제로 마이크 트랙이 붙은 뒤에만 "듣고 있어요" 상태로 전환 — 버튼을
    // 누른 시점이 아니라 오디오 입력이 실제로 시작된 시점을 반영해야 함.
    setIsRecording(true);

    const chunks: BlobPart[] = [];
    const recorder = new MediaRecorder(monitorStream);
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };
    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: recorder.mimeType });
      // localStorage에 새로고침 후에도 재생 가능하도록 blob: URL 대신
      // base64 data URL로 저장(직렬화 가능).
      pendingUserAudioRef.current = blobToDataUrl(blob);
    };
    recorder.start();
    userRecorderRef.current = recorder;

    // 오남용 방지: 마이크를 열어둔 채 방치되면 자동으로 답변완료 처리.
    recordingTimeoutRef.current = window.setTimeout(finishAnswer, MAX_RECORDING_MS);

    // UI에 보여줄 남은 시간 카운트다운 — 위 타임아웃과 별개로 1초마다 갱신.
    setRecordingSecondsLeft(MAX_RECORDING_MS / 1000);
    recordingIntervalRef.current = window.setInterval(() => {
      setRecordingSecondsLeft((seconds) => Math.max(0, seconds - 1));
    }, 1000);
  }, [finishAnswer, isAiResponding, isRecording, startLevelMeter, status, turnLimitReached, unlockAiPlaybackAudio]);

  return {
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
    maxTurns: MAX_TURNS,
    turnLimitReached,
    recordingSecondsLeft,
  };
}
