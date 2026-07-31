module Api
  module V1
    class TranslationsController < ApplicationController
      before_action :require_member!
      # 대화 화면(AI와 실시간 음성 대화)에서만 쓰는 부가 기능이라
      # realtime_sessions와 동일하게 CONVERSE로 게이트.
      before_action -> { require_membership_permission!(Permission::CONVERSE) }, only: [ :create ]

      def create
        request_dto = TranslationRequestDto.from(translation_params)
        render json: Translations::Create.new(text: request_dto.text).call
      rescue Translations::Create::BlankTextError
        render_error(
          code: Translations::Create::BlankTextError::CODE,
          message: "번역할 텍스트가 없습니다.",
          status: :unprocessable_content
        )
      rescue Translations::Create::TextTooLongError
        render_error(
          code: Translations::Create::TextTooLongError::CODE,
          message: "번역할 텍스트가 너무 깁니다. (최대 #{Translations::Create::MAX_TEXT_LENGTH}자)",
          status: :unprocessable_content
        )
      rescue OpenaiTranslationGatewayClient::ProviderError => e
        Rails.logger.error("Translations::Create failed: #{e.message}")
        render_error(
          code: OpenaiTranslationGatewayClient::ProviderError::CODE,
          message: "번역에 실패했습니다.",
          status: :bad_gateway
        )
      end

      private

      def translation_params
        params.permit(:text)
      end
    end
  end
end
