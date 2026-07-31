module Memberships
  class Revoke
    class NoActiveMembershipError < StandardError
      CODE = "NO_ACTIVE_MEMBERSHIP"
    end

    def initialize(member_id:)
      @member_id = member_id
    end

    def call
      member = Member.active.find(@member_id)
      member_membership = member.member_membership
      raise NoActiveMembershipError unless member_membership

      membership = member_membership.membership
      price = membership.price
      purchase_history = nil

      ActiveRecord::Base.transaction do
        member_membership.destroy!
        purchase_history = PurchaseHistory.record_cancel(member: member, membership: membership, price: price)
      end

      PurchaseHistoryDto.from(purchase_history)
    end
  end
end
