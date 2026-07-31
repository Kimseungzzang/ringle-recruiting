class ApplicationController < ActionController::API
  include ActionController::Cookies
  include ErrorHandling

  before_action :set_current_member

  private

  def set_current_member
    Current.member = Member.active.find_by(id: session[:member_id])
  end

  def current_member
    Current.member
  end

  # 모든 에러 응답을 { code, message } 형태로 통일.
  def render_error(code:, message:, status:)
    render json: { code: code, message: message }, status: status
  end

  def require_member!
    render_error(code: "UNAUTHORIZED", message: "로그인이 필요합니다.", status: :unauthorized) unless current_member
  end

  def require_admin!
    render_error(code: "FORBIDDEN", message: "관리자 권한이 필요합니다.", status: :forbidden) unless current_member&.admin?
  end

  def require_admin_or_self!(member_id)
    return if current_member&.admin?
    return if current_member&.id == member_id.to_i

    render_error(code: "FORBIDDEN", message: "본인 또는 관리자만 접근할 수 있습니다.", status: :forbidden)
  end

  # "멤버십 기한 만료 시 사용 불가" / 권한 조합 요구사항을 강제: 로그인한
  # 회원이 현재 활성 멤버십을 보유하고 있고, 그 멤버십이 permission_name
  # (Permission::STUDY / ::CONVERSE / ::ANALYZE 같은 row name)을 포함해야 함.
  def require_membership_permission!(permission_name)
    member_membership = current_member&.member_membership
    allowed = member_membership&.active? && member_membership.membership.permission?(permission_name)
    unless allowed
      render_error(code: "MEMBERSHIP_PERMISSION_REQUIRED", message: "해당 기능을 사용할 권한이 있는 멤버십이 필요합니다.", status: :forbidden)
    end
  end
end
