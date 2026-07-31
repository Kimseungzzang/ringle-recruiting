module RealtimeSessions
  class Create
    class InvalidVoiceError < StandardError
      CODE = "INVALID_VOICE"
    end

    def initialize(voice: nil, gateway: OpenaiRealtimeGatewayClient.new)
      @voice = voice
      @gateway = gateway
    end

    def call
      if @voice.present? && OpenaiRealtimeGatewayClient::ALLOWED_VOICES.exclude?(@voice)
        raise InvalidVoiceError
      end

      RealtimeSessionDto.from(@gateway.create_session(voice: @voice))
    end
  end
end
