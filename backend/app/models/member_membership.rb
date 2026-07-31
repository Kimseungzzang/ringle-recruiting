class MemberMembership < ApplicationRecord
  belongs_to :member
  belongs_to :membership

  validates :member_id, uniqueness: true
  validates :expires_at, presence: true

  def active?
    expires_at.present? && expires_at.future?
  end

  # 이미 활성 멤버십이 있고 "같은 플랜"을 재구매/재부여하면 연장(기존
  # 만료일 + 새 기간) — 재구매 시 남은 기간을 버리지 않기 위함. 활성
  # 멤버십이 없거나 이미 만료됐으면 지금부터 새로 시작. 활성 멤버십이
  # 있는데 "다른 플랜"으로 바뀌는 경우는 연장하지 않고 오늘 날짜부터
  # 새 플랜으로 덮어씀 — 안 그러면 예를 들어 베이직 남은 기간이 프리미엄
  # 보너스 일수로 그대로 넘어가버려 의도치 않은 업그레이드가 됨(요구사항엔
  # 명시돼 있지 않아 가정, 2026-07-31 결정 — 최초엔 "같은 플랜이면 연장"만
  # 있었는데 "플랜이 다르면"의 경우를 이렇게 분리함).
  def grant!(membership)
    same_plan_active = active? && self.membership_id == membership.id
    base_time = same_plan_active ? expires_at : Time.current

    update!(membership: membership, expires_at: base_time + membership.duration_days.days)
  end
end
