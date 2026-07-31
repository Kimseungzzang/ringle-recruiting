require "rails_helper"

RSpec.describe Memberships::List do
  describe "#call" do
    it "모든 멤버십을 DTO 목록으로 반환한다" do
      membership_a = create(:membership)
      membership_b = create(:membership)

      result = described_class.new.call

      expect(result).to all(be_a(MembershipDto))
      expect(result.map(&:id)).to contain_exactly(membership_a.id, membership_b.id)
    end

    it "멤버십이 없으면 빈 배열을 반환한다" do
      expect(described_class.new.call).to eq([])
    end
  end
end
