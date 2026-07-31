// gpt-realtime 모델이 실제로 지원하는 voice 목록 — 백엔드
// `OpenaiRealtimeGatewayClient::ALLOWED_VOICES`와 동일하게 맞춰야 함(일반
// TTS 엔드포인트가 지원하는 목록과는 다름, 예: fable/nova/onyx는 여기 없음).
export const VOICE_OPTIONS = [
  "alloy",
  "ash",
  "ballad",
  "coral",
  "echo",
  "sage",
  "shimmer",
  "verse",
  "marin",
  "cedar",
] as const;

export const DEFAULT_VOICE = "alloy";

// 여러 화면(주제 소개 화면의 선택 UI, 대화 화면의 세션 발급)이 같은 값을
// 읽고 써야 해서 로컬스토리지 키를 여기 한 곳에서만 정의.
const VOICE_STORAGE_KEY = "ringle-voice-preference";

export function getStoredVoice(): string {
  const stored = localStorage.getItem(VOICE_STORAGE_KEY);
  return stored && (VOICE_OPTIONS as readonly string[]).includes(stored) ? stored : DEFAULT_VOICE;
}

export function setStoredVoice(voice: string): void {
  localStorage.setItem(VOICE_STORAGE_KEY, voice);
}
