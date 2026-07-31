require "rails_helper"

RSpec.describe Memberships::Revoke do
  describe "#call" do
    it "활성 멤버십을 회수하고 취소 구매 이력을 반환한다" do
      member = create(:member)
      membership = create(:membership, price: 50_000)
      create(:member_membership, member: member, membership: membership)

      dto = described_class.new(member_id: member.id).call

      expect(dto).to be_a(PurchaseHistoryDto)
      expect(dto.source).to eq("cancel")
      expect(dto.state).to eq("completed")
      expect(dto.price_at_purchase).to eq(50_000)
      expect(member.reload.member_membership).to be_nil
    end

    it "회수 시 취소 구매 이력을 새로 남긴다" do
      member = create(:member)
      membership = create(:membership)
      create(:member_membership, member: member, membership: membership)

      expect { described_class.new(member_id: member.id).call }
        .to change(PurchaseHistory, :count).by(1)
    end

    it "보유한 멤버십이 없으면 NoActiveMembershipError를 발생시킨다" do
      member = create(:member)

      expect { described_class.new(member_id: member.id).call }
        .to raise_error(Memberships::Revoke::NoActiveMembershipError)
    end

    it "존재하지 않는 회원이면 RecordNotFound를 발생시킨다" do
      expect { described_class.new(member_id: -1).call }.to raise_error(ActiveRecord::RecordNotFound)
    end
  end
end
