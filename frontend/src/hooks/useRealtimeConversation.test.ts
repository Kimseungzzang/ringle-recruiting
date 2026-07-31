import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { VOICE_LEVEL_THRESHOLD, useRealtimeConversation } from "./useRealtimeConversation";
import { ApiError } from "../api/client";
import type { ConversationMessage, TopicDetail } from "../types/api";

vi.mock("../api/realtimeSessions");
vi.mock("../api/translations");

import { realtimeSessionsApi } from "../api/realtimeSessions";
import { translationsApi } from "../api/translations";

const realtimeSessionsApiMock = vi.mocked(realtimeSessionsApi);
const translationsApiMock = vi.mocked(translationsApi);

// --- WebRTC/미디어 브라우저 API를 jsdom에 없는 만큼만 최소로 흉내냄 ---

class FakeMediaStreamTrack {
  enabled = true;
  stop = vi.fn();
  clone = vi.fn(() => new FakeMediaStreamTrack());
}

class FakeMediaStream {
  private tracks: FakeMediaStreamTrack[];
  constructor(tracks: FakeMediaStreamTrack[] = []) {
    this.tracks = tracks;
  }
  getAudioTracks() {
    return this.tracks;
  }
  getTracks() {
    return this.tracks;
  }
  addTrack(track: FakeMediaStreamTrack) {
    this.tracks.push(track);
  }
}

class FakeRtpSender {
  replaceTrack = vi.fn().mockResolvedValue(undefined);
}

class FakeDataChannel extends EventTarget {
  send = vi.fn();
  close = vi.fn();
}

let lastDataChannel: FakeDataChannel;
let lastSender: FakeRtpSender;
let lastPeerConnection: FakePeerConnection;

class FakePeerConnection {
  ontrack: ((event: { streams: FakeMediaStream[] }) => void) | null = null;
  onconnectionstatechange: (() => void) | null = null;
  connectionState = "new";
  close = vi.fn();
  addTransceiver = vi.fn(() => {
    lastSender = new FakeRtpSender();
    return { sender: lastSender };
  });
  createDataChannel = vi.fn(() => {
    lastDataChannel = new FakeDataChannel();
    return lastDataChannel;
  });
  createOffer = vi.fn().mockResolvedValue({ type: "offer", sdp: "fake-offer-sdp" });
  setLocalDescription = vi.fn().mockResolvedValue(undefined);
  setRemoteDescription = vi.fn().mockResolvedValue(undefined);

  constructor() {
    // oxlint(no-this-alias)가 경고하지만, 생성된 인스턴스를 테스트에서
    // 참조하기 위한 의도적인 테스트 더블 패턴이라 허용.
    // oxlint-disable-next-line no-this-alias
    lastPeerConnection = this;
  }
}

// pc.connectionState가 바뀌었다고 알리는 걸 흉내냄(실제 브라우저는 내부적으로
// 이 콜백을 호출하지만, fake라 직접 트리거해줘야 함).
function simulateConnectionStateChange(state: string) {
  act(() => {
    lastPeerConnection.connectionState = state;
    lastPeerConnection.onconnectionstatechange?.();
  });
}

class FakeAnalyserNode {
  fftSize = 0;
  smoothingTimeConstant = 0;
  frequencyBinCount = 32;
  getByteFrequencyData = vi.fn((array: Uint8Array) => array.fill(0));
}

// 레벨 미터의 tick()은 매 애니메이션 프레임마다 analyser.getByteFrequencyData를
// 새로 호출하므로, 이미 startRecording()이 끝난 뒤에도 이 인스턴스의 mock을
// 바꿔치기하면(simulateVoiceLevel) 다음 프레임부터 바로 반영됨.
let lastAnalyserNode: FakeAnalyserNode;

class FakeAudioContext {
  createMediaStreamSource = vi.fn(() => ({ connect: vi.fn() }));
  createAnalyser = vi.fn(() => {
    lastAnalyserNode = new FakeAnalyserNode();
    return lastAnalyserNode;
  });
  close = vi.fn().mockResolvedValue(undefined);
}

// 서버 VAD를 껐기 때문에(turn_detection: null) "발화가 있었다"는 판단은
// 클라이언트 레벨 미터가 직접 함 — 테스트에서 발화를 흉내내려면 analyser가
// 큰 값을 리턴하게 만들고, 훅의 audioLevel이 반영될 때까지 기다려야 함.
function simulateVoiceLevel(level: number) {
  lastAnalyserNode.getByteFrequencyData = vi.fn((array: Uint8Array) =>
    array.fill(Math.round(level * 255)),
  );
}

let lastMediaRecorder: FakeMediaRecorder;

class FakeMediaRecorder {
  ondataavailable: ((event: { data: Blob }) => void) | null = null;
  onstop: (() => void) | null = null;
  mimeType = "audio/webm";
  start = vi.fn();
  stop = vi.fn(() => {
    this.ondataavailable?.({ data: new Blob(["x"], { type: "audio/webm" }) });
    this.onstop?.();
  });

  constructor() {
    // oxlint-disable-next-line no-this-alias
    lastMediaRecorder = this;
  }
}

let lastFakeAudio: FakeAudio | undefined;

class FakeAudio {
  src: string | undefined;
  muted = false;
  srcObject: unknown = null;
  play = vi.fn().mockResolvedValue(undefined);
  pause = vi.fn();
  constructor(src?: string) {
    this.src = src;
    // oxlint-disable-next-line no-this-alias
    lastFakeAudio = this;
  }
}

const getUserMediaMock = vi.fn();

function sendServerEvent(payload: Record<string, unknown>) {
  act(() => {
    lastDataChannel.dispatchEvent(new MessageEvent("message", { data: JSON.stringify(payload) }));
  });
}

function openDataChannel() {
  act(() => {
    lastDataChannel.dispatchEvent(new Event("open"));
  });
}

const topic: TopicDetail = {
  id: 6,
  title: "자기소개하기",
  title_en: "Introducing One's Name and Role at Work",
  paragraphs: [
    {
      id: 1,
      position: 0,
      translations: { ko: "본인을 소개해보세요.", eng: "Introduce yourself in a business setting." },
    },
  ],
};

beforeEach(() => {
  vi.stubGlobal("RTCPeerConnection", FakePeerConnection);
  vi.stubGlobal("MediaStream", FakeMediaStream);
  vi.stubGlobal("AudioContext", FakeAudioContext);
  vi.stubGlobal("MediaRecorder", FakeMediaRecorder);
  vi.stubGlobal("Audio", FakeAudio);
  lastFakeAudio = undefined;
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({ ok: true, text: async () => "fake-answer-sdp" }),
  );
  Object.defineProperty(navigator, "mediaDevices", {
    value: { getUserMedia: getUserMediaMock },
    configurable: true,
  });

  realtimeSessionsApiMock.create.mockResolvedValue({
    client_secret: "ek_test_secret",
    expires_at: "2026-01-01T00:00:00.000Z",
  });
  translationsApiMock.translate.mockResolvedValue({ translation: "번역된 텍스트" });
  getUserMediaMock.mockResolvedValue(new FakeMediaStream([new FakeMediaStreamTrack()]));
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe("useRealtimeConversation", () => {
  it("topic이 null이면 연결을 시도하지 않는다", () => {
    const { result } = renderHook(() => useRealtimeConversation(null, []));

    expect(result.current.status).toBe("idle");
    expect(realtimeSessionsApiMock.create).not.toHaveBeenCalled();
  });

  it("연결되면 session.update로 토픽 정보를 보내고, 첫 방문이면 인사말 응답을 트리거한다", async () => {
    const { result } = renderHook(() => useRealtimeConversation(topic, []));

    await waitFor(() => expect(lastDataChannel).toBeDefined());
    openDataChannel();

    await waitFor(() => expect(result.current.status).toBe("connected"));

    const sentEvents = lastDataChannel.send.mock.calls.map(([json]) => JSON.parse(json as string));
    const sessionUpdate = sentEvents.find((e) => e.type === "session.update");
    expect(sessionUpdate.session.instructions).toContain("Introducing One's Name and Role at Work");
    // 서버 VAD(server_vad)는 끔 — create_response:false를 써도 서버가
    // 침묵만으로 input_audio_buffer를 자동 커밋해버려서, "답변완료"를
    // 누르기 전에 문장 중간 pause에서 발화가 멋대로 쪼개지는 문제가 있었음.
    // 발화 경계는 전적으로 "답변완료" 버튼으로만 결정하도록 null로 고정.
    expect(sessionUpdate.session.audio.input.turn_detection).toBeNull();
    // language를 명시하지 않으면 한국인 억양 영어를 Whisper가 한국어로
    // 잘못 감지해서 STT 결과 자체가 한국어로 나오는 문제가 있었음 — 영어로 고정.
    expect(sessionUpdate.session.audio.input.transcription.language).toBe("en");

    const greeting = sentEvents.find((e) => e.type === "response.create");
    expect(greeting.response.instructions).toContain("Introducing One's Name and Role at Work");
  });

  it("voice를 지정하면 세션 발급 API에 그대로 전달한다", async () => {
    renderHook(() => useRealtimeConversation(topic, [], "marin"));

    await waitFor(() => expect(realtimeSessionsApiMock.create).toHaveBeenCalledWith("marin"));
  });

  it("이미 대화 기록이 있으면(재방문) 인사말 응답을 다시 트리거하지 않는다", async () => {
    const existing: ConversationMessage[] = [{ id: "1", role: "assistant", text: "안녕하세요" }];
    renderHook(() => useRealtimeConversation(topic, existing));

    await waitFor(() => expect(lastDataChannel).toBeDefined());
    openDataChannel();

    await waitFor(() => {
      const types = lastDataChannel.send.mock.calls.map(([json]) => JSON.parse(json as string).type);
      expect(types).toContain("session.update");
    });
    const types = lastDataChannel.send.mock.calls.map(([json]) => JSON.parse(json as string).type);
    expect(types).not.toContain("response.create");
  });

  it("재방문 시 화면에 남아있던 기존 대화를 conversation.item.create로 모델에도 재생시킨다", async () => {
    const existing: ConversationMessage[] = [
      { id: "1", role: "assistant", text: "안녕하세요" },
      { id: "2", role: "user", text: "네 안녕하세요" },
      // 아직 공개(tryRevealAiTurn) 전에 저장된 빈 placeholder는 재생 대상에서 제외돼야 함.
      { id: "3", role: "assistant", text: "" },
    ];
    renderHook(() => useRealtimeConversation(topic, existing));

    await waitFor(() => expect(lastDataChannel).toBeDefined());
    openDataChannel();

    await waitFor(() => {
      const types = lastDataChannel.send.mock.calls.map(([json]) => JSON.parse(json as string).type);
      expect(types.filter((type) => type === "conversation.item.create")).toHaveLength(2);
    });

    const items = lastDataChannel.send.mock.calls
      .map(([json]) => JSON.parse(json as string) as Record<string, unknown>)
      .filter((event) => event.type === "conversation.item.create");

    expect(items[0]?.item).toEqual({
      type: "message",
      role: "assistant",
      content: [{ type: "text", text: "안녕하세요" }],
    });
    expect(items[1]?.item).toEqual({
      type: "message",
      role: "user",
      content: [{ type: "input_text", text: "네 안녕하세요" }],
    });
  });

  it("답변완료 시 만들어둔 유저 메시지 자리를 STT 결과로 채우고 번역을 요청한다", async () => {
    const { result } = renderHook(() => useRealtimeConversation(topic, []));
    await waitFor(() => expect(lastDataChannel).toBeDefined());
    openDataChannel();
    await waitFor(() => expect(result.current.status).toBe("connected"));

    await act(async () => {
      await result.current.startRecording();
    });
    simulateVoiceLevel(1);
    await waitFor(() => expect(result.current.audioLevel).toBeGreaterThan(VOICE_LEVEL_THRESHOLD));
    act(() => {
      result.current.finishAnswer();
    });

    // response.create를 보내기 전에 이미 빈 유저 메시지 자리가 만들어져
    // 있어야 함(순서 보장을 위한 placeholder).
    expect(result.current.messages.some((m) => m.role === "user" && m.text === "")).toBe(true);

    sendServerEvent({
      type: "conversation.item.input_audio_transcription.completed",
      transcript: "Hi, my name is Jiwon.",
    });

    await waitFor(() =>
      expect(result.current.messages.some((m) => m.role === "user" && m.text === "Hi, my name is Jiwon.")).toBe(
        true,
      ),
    );
    // 새 메시지를 추가한 게 아니라 기존 자리를 채운 것이어야 함.
    expect(result.current.messages.filter((m) => m.role === "user")).toHaveLength(1);
    expect(translationsApiMock.translate).toHaveBeenCalledWith("Hi, my name is Jiwon.");
  });

  it("AI 응답 이벤트가 유저 STT 완료보다 먼저 도착해도 메시지 순서는 유저→AI로 유지된다", async () => {
    const { result } = renderHook(() => useRealtimeConversation(topic, []));
    await waitFor(() => expect(lastDataChannel).toBeDefined());
    openDataChannel();
    await waitFor(() => expect(result.current.status).toBe("connected"));

    await act(async () => {
      await result.current.startRecording();
    });
    simulateVoiceLevel(1);
    await waitFor(() => expect(result.current.audioLevel).toBeGreaterThan(VOICE_LEVEL_THRESHOLD));
    act(() => {
      result.current.finishAnswer();
    });

    // AI 응답 이벤트(response.created)가 유저 발화의 STT 완료 이벤트보다
    // 먼저 도착하는 상황을 흉내냄 — 실제로 종종 이런 순서로 옴.
    sendServerEvent({ type: "response.created" });
    sendServerEvent({
      type: "conversation.item.input_audio_transcription.completed",
      transcript: "Hi, my name is Jiwon.",
    });

    await waitFor(() =>
      expect(result.current.messages.some((m) => m.role === "user" && m.text === "Hi, my name is Jiwon.")).toBe(
        true,
      ),
    );

    const userIndex = result.current.messages.findIndex((m) => m.role === "user");
    const assistantIndex = result.current.messages.findIndex((m) => m.role === "assistant");
    expect(userIndex).toBeLessThan(assistantIndex);
  });

  it("유저 텍스트가 확정되기 전엔 AI 응답 텍스트를 화면에 반영하지 않고, 확정되는 순간 한꺼번에 공개한다", async () => {
    const { result } = renderHook(() => useRealtimeConversation(topic, []));
    await waitFor(() => expect(lastDataChannel).toBeDefined());
    openDataChannel();
    await waitFor(() => expect(result.current.status).toBe("connected"));

    await act(async () => {
      await result.current.startRecording();
    });
    simulateVoiceLevel(1);
    await waitFor(() => expect(result.current.audioLevel).toBeGreaterThan(VOICE_LEVEL_THRESHOLD));
    act(() => {
      result.current.finishAnswer();
    });

    sendServerEvent({ type: "response.created" });
    sendServerEvent({ type: "response.output_audio_transcript.delta", delta: "Nice to meet you." });
    // 오디오 트랙이 없어(ontrack 안 옴) recorder는 애초에 안 생김 — 응답
    // 생성 완료만으로 오디오 조건은 만족됨.
    sendServerEvent({ type: "response.done" });

    // 유저 텍스트가 아직 확정 전이라, 응답 생성이 끝났어도 AI 메시지는
    // 여전히 빈 텍스트여야 함(공개는 유저 텍스트 확정까지 보류).
    const assistantBeforeFlush = result.current.messages.find((m) => m.role === "assistant");
    expect(assistantBeforeFlush?.text).toBe("");

    sendServerEvent({
      type: "conversation.item.input_audio_transcription.completed",
      transcript: "Hi, my name is Jiwon.",
    });

    // 유저 텍스트가 확정되는 순간, 그동안 쌓아둔 AI 텍스트가 한꺼번에 반영돼야 함.
    await waitFor(() => {
      const assistantMessage = result.current.messages.find((m) => m.role === "assistant");
      expect(assistantMessage?.text).toBe("Nice to meet you.");
    });
  });

  it("첫 인사말처럼 유저 발화를 기다리지 않는 응답도 델타 도중엔 텍스트를 보여주지 않고, 응답이 끝나야 한꺼번에 공개한다", async () => {
    const { result } = renderHook(() => useRealtimeConversation(topic, []));
    await waitFor(() => expect(lastDataChannel).toBeDefined());
    openDataChannel();
    await waitFor(() => expect(result.current.status).toBe("connected"));

    sendServerEvent({ type: "response.created" });
    await waitFor(() => expect(result.current.isAiResponding).toBe(true));

    sendServerEvent({ type: "response.output_audio_transcript.delta", delta: "Nice " });
    sendServerEvent({ type: "response.output_audio_transcript.delta", delta: "to meet you." });

    // 델타가 오는 도중엔 아직 화면에 반영되지 않아야 함 — 텍스트만 먼저
    // 뜨고 오디오가 한참 뒤에 나오는 걸 막기 위해 응답 완료까지 보류.
    const assistantBeforeDone = result.current.messages.find((m) => m.role === "assistant");
    expect(assistantBeforeDone?.text).toBe("");

    // 오디오 트랙이 없어(ontrack 안 옴) recorder는 애초에 안 생기므로,
    // response.done만으로 공개 조건이 모두 충족된다.
    sendServerEvent({ type: "response.done" });
    await waitFor(() => expect(result.current.isAiResponding).toBe(false));

    await waitFor(() => {
      const assistantMessage = result.current.messages.find((m) => m.role === "assistant");
      expect(assistantMessage?.text).toBe("Nice to meet you.");
    });
    expect(translationsApiMock.translate).toHaveBeenCalledWith("Nice to meet you.");
  });

  it("response.done이 와도 AI 오디오 recorder를 바로 멈추지 않고, 오디오가 실제로 조용해질 때까지 기다렸다가 멈춘다", async () => {
    const { result } = renderHook(() => useRealtimeConversation(topic, []));
    await waitFor(() => expect(lastDataChannel).toBeDefined());
    openDataChannel();
    await waitFor(() => expect(result.current.status).toBe("connected"));

    // AI 오디오 recorder는 remote stream에 실제 오디오 트랙이 있어야
    // 생성됨(startAiAudioRecording의 가드) — 실제 브라우저에서는
    // pc.ontrack으로 들어오는 걸 흉내냄.
    act(() => {
      lastPeerConnection.ontrack?.({ streams: [new FakeMediaStream([new FakeMediaStreamTrack()])] });
    });

    sendServerEvent({ type: "response.created" });
    await waitFor(() => expect(result.current.isAiResponding).toBe(true));
    const aiRecorder = lastMediaRecorder;

    sendServerEvent({ type: "response.done" });

    // response.done 직후엔 아직 안 멈춰야 함(텍스트 완료 ≠ 오디오 재생 완료).
    expect(aiRecorder.stop).not.toHaveBeenCalled();

    // FakeAnalyserNode가 기본적으로 무음(0)을 리턴하므로, hangover 시간이
    // 지나면 "조용해졌다"고 판단해 멈춰야 함.
    await waitFor(() => expect(aiRecorder.stop).toHaveBeenCalled(), { timeout: 3000 });
  });

  it("AI 오디오 녹음이 유저 텍스트 확정 전에 끝나면 바로 재생하지 않고, 유저 텍스트가 확정되는 순간 재생한다", async () => {
    const { result } = renderHook(() => useRealtimeConversation(topic, []));
    await waitFor(() => expect(lastDataChannel).toBeDefined());
    openDataChannel();
    await waitFor(() => expect(result.current.status).toBe("connected"));

    act(() => {
      lastPeerConnection.ontrack?.({ streams: [new FakeMediaStream([new FakeMediaStreamTrack()])] });
    });

    await act(async () => {
      await result.current.startRecording();
    });
    // startRecording()이 마이크 시작 클릭(실제 유저 제스처) 시점에 재생용
    // 엘리먼트를 무음으로 미리 언락해둔다 — 이후 재생은 이 엘리먼트를 재사용.
    const playbackAudio = lastFakeAudio;
    expect(playbackAudio).toBeDefined();
    const playCallsBeforeFlush = playbackAudio?.play.mock.calls.length;

    simulateVoiceLevel(1);
    await waitFor(() => expect(result.current.audioLevel).toBeGreaterThan(VOICE_LEVEL_THRESHOLD));
    act(() => {
      result.current.finishAnswer();
    });

    sendServerEvent({ type: "response.created" });
    await waitFor(() => expect(result.current.isAiResponding).toBe(true));
    const aiRecorder = lastMediaRecorder;

    // response.done → 무음 감지로 recorder가 실제로 멈출 때까지(최대
    // AI_AUDIO_SILENCE_HANGOVER_MS) 기다림 — FakeAnalyserNode가 기본
    // 무음(0)을 리턴하므로 hangover가 지나면 자동으로 멈춘다.
    sendServerEvent({ type: "response.done" });
    await waitFor(() => expect(aiRecorder.stop).toHaveBeenCalled(), { timeout: 3000 });

    // 녹음(다시 듣기용 audioUrl)은 끝났지만, 유저 텍스트가 아직 확정
    // 전이라 자동 재생은 되지 않아야 함(재생용 엘리먼트에 추가 play() 호출이 없어야 함).
    await waitFor(() => {
      const assistantMessage = result.current.messages.find((m) => m.role === "assistant");
      expect(assistantMessage?.audioUrl).toBeDefined();
    });
    expect(playbackAudio?.play.mock.calls.length).toBe(playCallsBeforeFlush);

    sendServerEvent({
      type: "conversation.item.input_audio_transcription.completed",
      transcript: "Hi, my name is Jiwon.",
    });

    // 유저 텍스트가 확정되는 순간, 대기 중이던 AI 오디오가 언락된 엘리먼트로 재생돼야 함.
    await waitFor(() => expect(playbackAudio?.play.mock.calls.length).toBeGreaterThan(playCallsBeforeFlush ?? 0));
  });

  it("유저 텍스트가 이미 확정된 뒤에 AI 오디오 녹음이 끝나면 바로 재생한다", async () => {
    const { result } = renderHook(() => useRealtimeConversation(topic, []));
    await waitFor(() => expect(lastDataChannel).toBeDefined());
    openDataChannel();
    await waitFor(() => expect(result.current.status).toBe("connected"));

    act(() => {
      lastPeerConnection.ontrack?.({ streams: [new FakeMediaStream([new FakeMediaStreamTrack()])] });
    });

    await act(async () => {
      await result.current.startRecording();
    });
    const playbackAudio = lastFakeAudio;
    expect(playbackAudio).toBeDefined();
    const playCallsBeforeStop = playbackAudio?.play.mock.calls.length;

    simulateVoiceLevel(1);
    await waitFor(() => expect(result.current.audioLevel).toBeGreaterThan(VOICE_LEVEL_THRESHOLD));
    act(() => {
      result.current.finishAnswer();
    });

    sendServerEvent({
      type: "conversation.item.input_audio_transcription.completed",
      transcript: "Hi, my name is Jiwon.",
    });
    await waitFor(() =>
      expect(result.current.messages.some((m) => m.role === "user" && m.text === "Hi, my name is Jiwon.")).toBe(
        true,
      ),
    );

    sendServerEvent({ type: "response.created" });
    await waitFor(() => expect(result.current.isAiResponding).toBe(true));

    sendServerEvent({ type: "response.done" });

    // 유저 텍스트가 이미 확정된 뒤라, recorder가 무음 감지로 멈추자마자
    // (response.done → hangover 경과) 바로 재생돼야 함.
    await waitFor(() => expect(playbackAudio?.play.mock.calls.length).toBeGreaterThan(playCallsBeforeStop ?? 0), {
      timeout: 3000,
    });
  });

  it("마이크 권한이 거부되면 에러 메시지를 보여주고 녹음 상태로 전환하지 않는다", async () => {
    getUserMediaMock.mockRejectedValue(new DOMException("denied", "NotAllowedError"));
    const { result } = renderHook(() => useRealtimeConversation(topic, []));
    await waitFor(() => expect(lastDataChannel).toBeDefined());
    openDataChannel();
    await waitFor(() => expect(result.current.status).toBe("connected"));

    await act(async () => {
      await result.current.startRecording();
    });

    expect(result.current.isRecording).toBe(false);
    expect(result.current.errorMessage).toContain("마이크 권한이 필요합니다");
  });

  it("마이크를 얻으면 sender에 트랙을 붙이고 녹음 상태가 된다", async () => {
    const { result } = renderHook(() => useRealtimeConversation(topic, []));
    await waitFor(() => expect(lastDataChannel).toBeDefined());
    openDataChannel();
    await waitFor(() => expect(result.current.status).toBe("connected"));

    await act(async () => {
      await result.current.startRecording();
    });

    expect(result.current.isRecording).toBe(true);
    expect(lastSender.replaceTrack).toHaveBeenCalled();
  });

  it("레벨 미터/로컬 녹음은 VAD로 게이팅되는 원본 트랙이 아니라 별도 clone을 쓴다(원본이 꺼져도 레벨 측정이 안 죽도록)", async () => {
    const micTrack = new FakeMediaStreamTrack();
    getUserMediaMock.mockResolvedValue(new FakeMediaStream([micTrack]));

    const { result } = renderHook(() => useRealtimeConversation(topic, []));
    await waitFor(() => expect(lastDataChannel).toBeDefined());
    openDataChannel();
    await waitFor(() => expect(result.current.status).toBe("connected"));

    await act(async () => {
      await result.current.startRecording();
    });

    // 레벨 미터/로컬 녹음이 원본 트랙을 그대로 쓴다면 clone()이 호출될
    // 이유가 없음 — 호출됐다는 건 별도 트랙으로 분리했다는 뜻.
    expect(micTrack.clone).toHaveBeenCalled();

    // VAD가 원본 트랙을 꺼도(무음 판단), clone은 독립된 객체라 영향을
    // 받지 않아야 함 — 레벨 측정이 계속 살아있을 수 있는 핵심 조건.
    const monitorTrack = micTrack.clone.mock.results[0]?.value as FakeMediaStreamTrack;
    micTrack.enabled = false;
    expect(monitorTrack.enabled).toBe(true);
  });

  it("이번 턴에 발화가 감지되지 않았으면 답변완료 시 clear만 보내고 응답을 요청하지 않는다", async () => {
    const { result } = renderHook(() => useRealtimeConversation(topic, []));
    await waitFor(() => expect(lastDataChannel).toBeDefined());
    openDataChannel();
    await waitFor(() => expect(result.current.status).toBe("connected"));

    await act(async () => {
      await result.current.startRecording();
    });
    lastDataChannel.send.mockClear();

    act(() => {
      result.current.finishAnswer();
    });

    const types = lastDataChannel.send.mock.calls.map(([json]) => JSON.parse(json as string).type);
    expect(types).toEqual(["input_audio_buffer.clear"]);
  });

  it("이번 턴에 발화가 감지됐으면 답변완료 시 commit과 response.create를 보낸다", async () => {
    const { result } = renderHook(() => useRealtimeConversation(topic, []));
    await waitFor(() => expect(lastDataChannel).toBeDefined());
    openDataChannel();
    await waitFor(() => expect(result.current.status).toBe("connected"));

    await act(async () => {
      await result.current.startRecording();
    });
    simulateVoiceLevel(1);
    await waitFor(() => expect(result.current.audioLevel).toBeGreaterThan(VOICE_LEVEL_THRESHOLD));
    lastDataChannel.send.mockClear();

    act(() => {
      result.current.finishAnswer();
    });

    const types = lastDataChannel.send.mock.calls.map(([json]) => JSON.parse(json as string).type);
    expect(types).toEqual(["input_audio_buffer.commit", "response.create"]);
  });

  it("발화가 감지된 턴을 완료할 때마다 turnCount가 증가한다", async () => {
    const { result } = renderHook(() => useRealtimeConversation(topic, []));
    await waitFor(() => expect(lastDataChannel).toBeDefined());
    openDataChannel();
    await waitFor(() => expect(result.current.status).toBe("connected"));

    await act(async () => {
      await result.current.startRecording();
    });
    simulateVoiceLevel(1);
    await waitFor(() => expect(result.current.audioLevel).toBeGreaterThan(VOICE_LEVEL_THRESHOLD));
    act(() => {
      result.current.finishAnswer();
    });

    expect(result.current.turnCount).toBe(1);
    expect(result.current.turnLimitReached).toBe(false);
  });

  it("발화가 감지되지 않은 턴은 turnCount를 증가시키지 않는다", async () => {
    const { result } = renderHook(() => useRealtimeConversation(topic, []));
    await waitFor(() => expect(lastDataChannel).toBeDefined());
    openDataChannel();
    await waitFor(() => expect(result.current.status).toBe("connected"));

    await act(async () => {
      await result.current.startRecording();
    });
    act(() => {
      result.current.finishAnswer();
    });

    expect(result.current.turnCount).toBe(0);
  });

  it("턴 상한(maxTurns)에 도달하면 마이크를 더 이상 시작할 수 없다", async () => {
    const { result } = renderHook(() => useRealtimeConversation(topic, []));
    await waitFor(() => expect(lastDataChannel).toBeDefined());
    openDataChannel();
    await waitFor(() => expect(result.current.status).toBe("connected"));

    for (let i = 0; i < result.current.maxTurns; i += 1) {
      await act(async () => {
        await result.current.startRecording();
      });
      simulateVoiceLevel(1);
      await waitFor(() => expect(result.current.audioLevel).toBeGreaterThan(VOICE_LEVEL_THRESHOLD));
      act(() => {
        result.current.finishAnswer();
      });
    }

    expect(result.current.turnCount).toBe(result.current.maxTurns);
    expect(result.current.turnLimitReached).toBe(true);

    const sendCallsBefore = lastDataChannel.send.mock.calls.length;
    await act(async () => {
      await result.current.startRecording();
    });
    expect(result.current.isRecording).toBe(false);
    expect(lastDataChannel.send.mock.calls.length).toBe(sendCallsBefore);
  });

  it("reconnect()로 새 세션을 시작하면 turnCount가 초기화된다", async () => {
    const { result } = renderHook(() => useRealtimeConversation(topic, []));
    await waitFor(() => expect(lastDataChannel).toBeDefined());
    openDataChannel();
    await waitFor(() => expect(result.current.status).toBe("connected"));

    await act(async () => {
      await result.current.startRecording();
    });
    simulateVoiceLevel(1);
    await waitFor(() => expect(result.current.audioLevel).toBeGreaterThan(VOICE_LEVEL_THRESHOLD));
    act(() => {
      result.current.finishAnswer();
    });
    expect(result.current.turnCount).toBe(1);

    act(() => result.current.reconnect());
    await waitFor(() => expect(lastDataChannel).toBeDefined());
    openDataChannel();
    await waitFor(() => expect(result.current.status).toBe("connected"));

    expect(result.current.turnCount).toBe(0);
  });

  it("restart()를 호출하면 대화 기록을 비우고 새 세션으로 인사말을 다시 트리거한다", async () => {
    const { result } = renderHook(() => useRealtimeConversation(topic, []));
    await waitFor(() => expect(lastDataChannel).toBeDefined());
    openDataChannel();
    await waitFor(() => expect(result.current.status).toBe("connected"));

    await act(async () => {
      await result.current.startRecording();
    });
    simulateVoiceLevel(1);
    await waitFor(() => expect(result.current.audioLevel).toBeGreaterThan(VOICE_LEVEL_THRESHOLD));
    act(() => {
      result.current.finishAnswer();
    });
    sendServerEvent({
      type: "conversation.item.input_audio_transcription.completed",
      transcript: "Hi, my name is Jiwon.",
    });
    await waitFor(() => expect(result.current.messages.length).toBeGreaterThan(0));

    const previousDataChannel = lastDataChannel;
    act(() => result.current.restart());

    expect(result.current.messages).toEqual([]);

    // 새 세션이 실제로 새 data channel로 다시 연결됐는지 확인 — 그냥
    // lastDataChannel이 정의돼 있는지만 보면 restart 이전 값이 그대로
    // 남아있어도 통과해버리므로, 참조가 바뀌었는지까지 확인해야 함.
    await waitFor(() => expect(lastDataChannel).not.toBe(previousDataChannel));
    openDataChannel();
    await waitFor(() => expect(result.current.status).toBe("connected"));

    const types = lastDataChannel.send.mock.calls.map(([json]) => JSON.parse(json as string).type);
    expect(types).toContain("response.create");
  });

  it("초기 연결이 일반 오류로 실패하면 즉시 failed로 보내지 않고 재연결을 예약한다", async () => {
    realtimeSessionsApiMock.create.mockRejectedValue(new Error("network down"));
    const { result } = renderHook(() => useRealtimeConversation(topic, []));

    await waitFor(() => expect(result.current.errorMessage).toContain("(1/3)"));

    // 재시도가 예약된 상태일 뿐 아직 최종 실패는 아님 — 타이머가 실제로
    // 발화될 때까지 기다리는 건 느리고 불안정해질 수 있어 여기까지만 검증.
    expect(result.current.status).toBe("connecting");
  });

  it("401/403 같은 권한 오류는 재시도 없이 바로 failed 상태가 된다", async () => {
    realtimeSessionsApiMock.create.mockRejectedValue(
      new ApiError(403, { code: "MEMBERSHIP_PERMISSION_REQUIRED", message: "권한이 없습니다." }),
    );
    const { result } = renderHook(() => useRealtimeConversation(topic, []));

    await waitFor(() => expect(result.current.status).toBe("failed"));
    expect(result.current.errorMessage).toBe("권한이 없습니다.");
    expect(realtimeSessionsApiMock.create).toHaveBeenCalledTimes(1);
  });

  it("reconnect()를 호출하면 처음부터 다시 연결을 시도한다", async () => {
    realtimeSessionsApiMock.create.mockRejectedValueOnce(
      new ApiError(401, { code: "UNAUTHORIZED", message: "로그인이 필요합니다." }),
    );
    const { result } = renderHook(() => useRealtimeConversation(topic, []));
    await waitFor(() => expect(result.current.status).toBe("failed"));

    realtimeSessionsApiMock.create.mockResolvedValue({
      client_secret: "ek_retry_secret",
      expires_at: "2026-01-01T00:00:00.000Z",
    });
    act(() => result.current.reconnect());

    await waitFor(() => expect(lastDataChannel).toBeDefined());
    openDataChannel();

    await waitFor(() => expect(result.current.status).toBe("connected"));
    expect(realtimeSessionsApiMock.create).toHaveBeenCalledTimes(2);
  });

  it("연결된 뒤 네트워크가 끊기면(connectionState: failed) 재연결을 예약한다", async () => {
    const { result } = renderHook(() => useRealtimeConversation(topic, []));
    await waitFor(() => expect(lastDataChannel).toBeDefined());
    openDataChannel();
    await waitFor(() => expect(result.current.status).toBe("connected"));

    simulateConnectionStateChange("failed");

    await waitFor(() => expect(result.current.errorMessage).toContain("네트워크 연결이 끊겼습니다"));
    expect(result.current.status).toBe("connecting");
  });
});
