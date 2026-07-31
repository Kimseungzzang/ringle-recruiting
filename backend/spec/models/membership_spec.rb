require "rails_helper"

RSpec.describe Membership, type: :model do
  describe "associations" do
    it { is_expected.to have_many(:member_memberships).dependent(:restrict_with_error) }
    it { is_expected.to have_many(:purchase_histories).dependent(:restrict_with_error) }
    it { is_expected.to have_many(:membership_permissions).dependent(:destroy) }
    it { is_expected.to have_many(:permissions).through(:membership_permissions) }
  end

  describe "validations" do
    # shoulda-matchers의 uniqueness 케이스 감도 체크는 알파벳이 있어야 동작해서
    # 한글 factory 기본값 대신 영문 이름을 명시적으로 줌.
    subject { create(:membership, name: "premium-plan") }

    it { is_expected.to validate_presence_of(:name) }
    it { is_expected.to validate_uniqueness_of(:name) }
    it { is_expected.to validate_numericality_of(:duration_days).only_integer.is_greater_than(0) }
    it { is_expected.to validate_numericality_of(:price).only_integer.is_greater_than_or_equal_to(0) }
  end

  describe "#permission?" do
    it "returns true when the membership has that permission" do
      membership = create(:membership)
      membership.permissions << create(:permission, :converse)

      expect(membership.permission?(Permission::CONVERSE)).to eq(true)
    end

    it "returns false when the membership doesn't have that permission" do
      membership = create(:membership)
      expect(membership.permission?(Permission::CONVERSE)).to eq(false)
    end
  end
end
