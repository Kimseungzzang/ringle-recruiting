module Translations
  class Create
    # 대화 한 턴 분량을 넉넉히 잡은 상한 — 이보다 길면 정상적인 대화 발화가
    # 아니라고 보고 거절(과도한 요청으로 인한 비용 낭비 방지).
    MAX_TEXT_LENGTH = 2_000

    class BlankTextError < StandardError
      CODE = "BLANK_TEXT"
    end

    class TextTooLongError < StandardError
      CODE = "TEXT_TOO_LONG"
    end

    def initialize(text:, gateway: OpenaiTranslationGatewayClient.new)
      @text = text
      @gateway = gateway
    end

    def call
      raise BlankTextError if @text.blank?
      raise TextTooLongError if @text.length > MAX_TEXT_LENGTH

      TranslationDto.from(@gateway.translate(text: @text))
    end
  end
end
