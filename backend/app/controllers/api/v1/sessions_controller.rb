module Api
  module V1
    class SessionsController < ApplicationController
      def create
        request_dto = LoginRequestDto.from(session_params)
        member_dto = Auth::Login.new(request: request_dto).call
        session[:member_id] = member_dto.id

        render json: LoginResponseDto.new(member: member_dto)
      rescue Auth::Login::InvalidCredentialsError
        render_error(
          code: Auth::Login::InvalidCredentialsError::CODE,
          message: "아이디 또는 비밀번호가 올바르지 않습니다.",
          status: :unauthorized
        )
      end

      def destroy
        session[:member_id] = nil
        head :no_content
      end

      private

      def session_params
        params.permit(:login_id, :password)
      end
    end
  end
end
