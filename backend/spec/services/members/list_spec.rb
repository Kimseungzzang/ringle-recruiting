require "rails_helper"

RSpec.describe Members::List do
  describe "#call" do
    it "삭제되지 않은 회원을 id 순으로, 멤버십 정보와 함께 DTO로 반환한다" do
      member_without_membership = create(:member)
      member_with_membership = create(:member)
      membership = create(:membership)
      create(:member_membership, member: member_with_membership, membership: membership)

      dtos = described_class.new.call

      expect(dtos).to all(be_a(MemberDetailDto))
      ids = dtos.map(&:id)
      expect(ids).to eq(ids.sort)
      expect(ids).to include(member_without_membership.id, member_with_membership.id)

      with_membership_dto = dtos.find { |dto| dto.id == member_with_membership.id }
      expect(with_membership_dto.membership.membership.id).to eq(membership.id)

      without_membership_dto = dtos.find { |dto| dto.id == member_without_membership.id }
      expect(without_membership_dto.membership).to be_nil
    end

    it "삭제된 회원은 목록에서 빠진다" do
      deleted_member = create(:member, deleted_at: Time.current)

      dtos = described_class.new.call

      expect(dtos.map(&:id)).not_to include(deleted_member.id)
    end
  end
end
