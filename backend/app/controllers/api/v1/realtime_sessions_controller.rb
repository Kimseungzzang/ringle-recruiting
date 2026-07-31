module Api
  module V1
    class RealtimeSessionsController < ApplicationController
      before_action :require_member!
      # AI와 실시간으로 음성 대화하는 기능 자체가 "대화" 권한 영역이라서
      # CONVERSE로 게이트 — 베이직(학습만) 멤버십은 대화 화면에 진입할 수
      # 없고, 프리미엄(학습+대화+분석)만 가능함.
      before_action -> { require_membership_permission!(Permission::CONVERSE) }, only: [ :create ]

      def create
        request_dto = RealtimeSessionRequestDto.from(realtime_session_params)
        render json: RealtimeSessions::Create.new(voice: request_dto.voice).call
      rescue RealtimeSessions::Create::InvalidVoiceError
        render_error(
          code: RealtimeSessions::Create::InvalidVoiceError::CODE,
          message: "지원하지 않는 voice입니다. (#{OpenaiRealtimeGatewayClient::ALLOWED_VOICES.join(', ')})",
          status: :unprocessable_content
        )
      rescue OpenaiRealtimeGatewayClient::ProviderError => e
        Rails.logger.error("RealtimeSessions::Create failed: #{e.message}")
        render_error(
          code: OpenaiRealtimeGatewayClient::ProviderError::CODE,
          message: "AI 세션 발급에 실패했습니다.",
          status: :bad_gateway
        )
      end

      private

      def realtime_session_params
        params.permit(:voice)
      end
    end
  end
end
