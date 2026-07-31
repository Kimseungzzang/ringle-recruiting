module Api
  module V1
    class PaymentsController < ApplicationController
      before_action :require_member!

      def create
        request_dto = PaymentRequestDto.from(payment_params)
        member_membership_dto = Payments::Create.new(
          member: current_member,
          membership_id: request_dto.membership_id
        ).call

        render json: member_membership_dto
      rescue Payments::Create::PaymentFailedError
        render_error(
          code: Payments::Create::PaymentFailedError::CODE,
          message: "결제에 실패했습니다.",
          status: :payment_required
        )
      end

      private

      def payment_params
        params.permit(:membership_id)
      end
    end
  end
end
