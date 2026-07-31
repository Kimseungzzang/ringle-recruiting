module Api
  module V1
    module Admin
      class MemberMembershipsController < BaseController
        def grant
          member_membership_dto = Memberships::Grant.new(
            member_id: params[:member_id],
            membership_id: grant_params[:membership_id],
            price_at_purchase: 0
          ).call

          render json: member_membership_dto
        end

        def revoke
          Memberships::Revoke.new(member_id: params[:member_id]).call

          head :no_content
        rescue Memberships::Revoke::NoActiveMembershipError
          render_error(
            code: Memberships::Revoke::NoActiveMembershipError::CODE,
            message: "보유 중인 멤버십이 없습니다.",
            status: :unprocessable_content
          )
        end

        private

        def grant_params
          params.permit(:membership_id)
        end
      end
    end
  end
end
