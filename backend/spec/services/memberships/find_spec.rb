require "rails_helper"

RSpec.describe Memberships::Find do
  describe "#call" do
    it "멤버십을 DTO로 반환하며 소속 권한 이름도 포함한다" do
      membership = create(:membership)
      membership.permissions << create(:permission, :study)

      dto = described_class.new(id: membership.id).call

      expect(dto).to be_a(MembershipDto)
      expect(dto.id).to eq(membership.id)
      expect(dto.permissions).to eq([ Permission::STUDY ])
    end

    it "존재하지 않는 멤버십이면 RecordNotFound를 발생시킨다" do
      expect { described_class.new(id: -1).call }.to raise_error(ActiveRecord::RecordNotFound)
    end
  end
end
