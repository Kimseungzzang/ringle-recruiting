require "rails_helper"

RSpec.describe Members::Find do
  describe "#call" do
    it "멤버십이 없는 회원을 조회하면 membership이 nil인 DTO를 반환한다" do
      member = create(:member)

      dto = described_class.new(id: member.id).call

      expect(dto).to be_a(MemberDetailDto)
      expect(dto.id).to eq(member.id)
      expect(dto.membership).to be_nil
    end

    it "멤버십이 있는 회원을 조회하면 멤버십 정보를 포함한 DTO를 반환한다" do
      member = create(:member)
      membership = create(:membership)
      create(:member_membership, member: member, membership: membership)

      dto = described_class.new(id: member.id).call

      expect(dto.membership).to be_a(MemberMembershipDto)
      expect(dto.membership.membership.id).to eq(membership.id)
    end

    it "존재하지 않는 회원이면 RecordNotFound를 발생시킨다" do
      expect { described_class.new(id: -1).call }.to raise_error(ActiveRecord::RecordNotFound)
    end

    it "삭제된 회원은 조회되지 않는다" do
      member = create(:member, deleted_at: Time.current)

      expect { described_class.new(id: member.id).call }.to raise_error(ActiveRecord::RecordNotFound)
    end
  end
end
