module ErrorHandling
  extend ActiveSupport::Concern

  included do
    rescue_from ActiveRecord::RecordNotFound do |exception|
      # 예: Member 조회 실패 -> code "MEMBER_NOT_FOUND"
      code = "#{exception.model.underscore.upcase}_NOT_FOUND"
      render_error(code: code, message: "#{exception.model}을(를) 찾을 수 없습니다.", status: :not_found)
    end

    rescue_from ActiveRecord::RecordInvalid do |exception|
      render_error(
        code: "VALIDATION_ERROR",
        message: exception.record.errors.full_messages.join(", "),
        status: :unprocessable_content
      )
    end
  end
end
