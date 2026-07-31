require "rails_helper"

RSpec.describe Payments::Create do
  describe "#call" do
    it "결제에 성공하면 멤버십을 부여하고 멤버십 정보를 반환한다" do
      member = create(:member)
      membership = create(:membership, price: 50_000)
      gateway = instance_double(MockPaymentGatewayClient)
      allow(gateway).to receive(:charge)
        .with(amount: 50_000)
        .and_return(MockPaymentGatewayClient::Result.new(success?: true))

      dto = described_class.new(member: member, membership_id: membership.id, payment_gateway: gateway).call

      expect(dto).to be_a(MemberMembershipDto)
      expect(member.reload.member_membership).to be_present
    end

    it "결제 성공 시 pending으로 기록한 구매 이력을 그대로 완료 처리하고 새 이력을 만들지 않는다" do
      member = create(:member)
      membership = create(:membership, price: 50_000)
      gateway = instance_double(
        MockPaymentGatewayClient, charge: MockPaymentGatewayClient::Result.new(success?: true)
      )

      expect {
        described_class.new(member: member, membership_id: membership.id, payment_gateway: gateway).call
      }.to change(PurchaseHistory, :count).by(1)

      purchase_history = PurchaseHistory.last
      expect(purchase_history.source).to eq("purchase")
      expect(purchase_history.state).to eq("completed")
    end

    it "결제에 실패하면 구매 이력을 실패로 남기고 PaymentFailedError를 발생시키며 멤버십을 부여하지 않는다" do
      member = create(:member)
      membership = create(:membership, price: 50_000)
      gateway = instance_double(
        MockPaymentGatewayClient, charge: MockPaymentGatewayClient::Result.new(success?: false)
      )

      expect {
        expect {
          described_class.new(member: member, membership_id: membership.id, payment_gateway: gateway).call
        }.to raise_error(Payments::Create::PaymentFailedError)
      }.to change(PurchaseHistory, :count).by(1)

      purchase_history = PurchaseHistory.last
      expect(purchase_history.state).to eq("failed")
      expect(member.reload.member_membership).to be_nil
    end

    it "존재하지 않는 멤버십이면 RecordNotFound를 발생시킨다" do
      member = create(:member)
      gateway = instance_double(MockPaymentGatewayClient)

      expect {
        described_class.new(member: member, membership_id: -1, payment_gateway: gateway).call
      }.to raise_error(ActiveRecord::RecordNotFound)
    end
  end
end
