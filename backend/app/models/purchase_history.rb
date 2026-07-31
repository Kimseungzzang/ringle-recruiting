class PurchaseHistory < ApplicationRecord
  belongs_to :member
  belongs_to :membership

  enum :source, { purchase: 0, cancel: 1, admin: 2 }
  enum :state, { pending: 0, completed: 1, failed: 2 }

  validates :source, presence: true
  validates :state, presence: true
  validates :price_at_purchase, numericality: { only_integer: true, greater_than_or_equal_to: 0 }

  class << self
    # 유저 결제 주문 생성 — PG 응답을 받기 전 pending 상태로 먼저 기록.
    def record_order(member:, membership:, price:)
      create!(member: member, membership: membership, source: :purchase, state: :pending, price_at_purchase: price)
    end

    # 어드민이 결제 없이 즉시 부여 — pending 단계 없이 바로 completed.
    def record_admin_grant(member:, membership:, price:)
      create!(member: member, membership: membership, source: :admin, state: :completed, price_at_purchase: price)
    end

    # 어드민 회수 — 회수 당시 멤버십 가격을 기록.
    def record_cancel(member:, membership:, price:)
      create!(member: member, membership: membership, source: :cancel, state: :completed, price_at_purchase: price)
    end
  end

  def complete!
    update!(state: :completed)
  end

  def fail!
    update!(state: :failed)
  end
end
