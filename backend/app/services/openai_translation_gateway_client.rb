require "net/http"

# 영->한 번역 전용 경량 LLM 호출 — 학습 대화 화면에서 유저 발화/AI 응답을
# 한국어 번역과 함께 보여주기 위해 사용. Realtime 세션(WebRTC)과는 무관하게
# 완전히 독립적인 일반 텍스트 API 호출.
# 인스턴스 메서드로 만들어서 Translations::Create 생성자에 주입 가능하게 함.
class OpenaiTranslationGatewayClient
  class ProviderError < StandardError
    CODE = "PROVIDER_ERROR"
  end

  ENDPOINT = URI("https://api.openai.com/v1/chat/completions")
  MODEL = "gpt-4o-mini"
  SYSTEM_PROMPT = "You are a translation engine for an English-learning app. " \
                   "Translate the given English text into natural, concise Korean. " \
                   "Reply with only the translated Korean text, with no quotes or extra commentary."

  def translate(text:)
    api_key = Rails.application.credentials.openai_api_key
    raise ProviderError, "openai_api_key is not configured" if api_key.blank?

    response = Net::HTTP.post(
      ENDPOINT,
      {
        model: MODEL,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: text }
        ]
      }.to_json,
      "Authorization" => "Bearer #{api_key}",
      "Content-Type" => "application/json"
    )

    raise ProviderError, response.body unless response.is_a?(Net::HTTPSuccess)

    JSON.parse(response.body)
  end
end
