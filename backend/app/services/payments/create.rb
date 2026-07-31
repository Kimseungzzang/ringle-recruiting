module Payments
  class Create
    class PaymentFailedError < StandardError
      CODE = "PAYMENT_FAILED"
    end

    def initialize(member:, membership_id:, payment_gateway: MockPaymentGatewayClient.new)
      @member = member
      @membership_id = membership_id
      @payment_gateway = payment_gateway
    end

    def call
      membership = Membership.find(@membership_id)
      # order: PG 결과를 알기 전에 시도 자체를 pending으로 먼저 기록한다.
      purchase_history = PurchaseHistory.record_order(member: @member, membership: membership, price: membership.price)

      result = @payment_gateway.charge(amount: membership.price)

      # complete: 성공이면 이 pending row를 그대로 넘겨서 Memberships::Grant가
      # 새 row를 또 만들지 않고 completed로 갱신하며 멤버십을 부여하게 한다.
      unless result.success?
        purchase_history.fail!
        raise PaymentFailedError
      end

      Memberships::Grant.new(
        member_id: @member.id,
        membership_id: membership.id,
        price_at_purchase: membership.price,
        purchase_history: purchase_history
      ).call
    end
  end
end
