require "net/http"

# OpenAI Realtime API 게이트웨이 — 진짜 API 키로 서버 대 서버 호출해서 단기
# (1분) client secret만 발급한다. 프론트는 이 결과값(ephemeral secret)으로
# OpenAI에 직접 WebRTC 연결하며, 진짜 키는 절대 노출되지 않는다.
# 인스턴스 메서드로 만들어서 RealtimeSessions::Create 생성자에 주입 가능하게 함.
class OpenaiRealtimeGatewayClient
  class ProviderError < StandardError
    CODE = "PROVIDER_ERROR"
  end

  ENDPOINT = URI("https://api.openai.com/v1/realtime/client_secrets")
  MODEL = "gpt-realtime"
  DEFAULT_VOICE = "alloy"
  # gpt-realtime 모델이 실제로 지원하는 voice 목록(2026-07-31 기준, OpenAI
  # 공식 문서로 확인함) — 일반 TTS 엔드포인트가 지원하는 목록과는 다르다
  # (예: fable/nova/onyx는 TTS에는 있지만 Realtime API엔 없음). 새 DB
  # 테이블 없이 상수로 관리 — OpenAI가 정해놓은 고정된 값이라 카탈로그
  # 테이블까지는 과함.
  ALLOWED_VOICES = %w[alloy ash ballad coral echo sage shimmer verse marin cedar].freeze
  # 발급받자마자 같은 요청 흐름 안에서 바로 WebRTC handshake에 써버리기
  # 때문에(보통 1초 안쪽) 원래 10분(600)은 과했음 — 토큰이 새는 비정상
  # 상황에서의 노출 시간을 최소화하기 위해 1분으로 줄임(2026-07-31 결정).
  EXPIRES_IN_SECONDS = 60

  def create_session(voice: nil)
    api_key = Rails.application.credentials.openai_api_key
    raise ProviderError, "openai_api_key is not configured" if api_key.blank?

    response = Net::HTTP.post(
      ENDPOINT,
      {
        expires_after: { anchor: "created_at", seconds: EXPIRES_IN_SECONDS },
        session: {
          type: "realtime",
          model: MODEL,
          audio: { output: { voice: voice.presence || DEFAULT_VOICE } }
        }
      }.to_json,
      "Authorization" => "Bearer #{api_key}",
      "Content-Type" => "application/json"
    )

    raise ProviderError, response.body unless response.is_a?(Net::HTTPSuccess)

    JSON.parse(response.body)
  end
end
