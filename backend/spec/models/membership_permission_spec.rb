require "rails_helper"

RSpec.describe MembershipPermission, type: :model do
  describe "associations" do
    it { is_expected.to belong_to(:membership) }
    it { is_expected.to belong_to(:permission) }
  end

  describe "uniqueness" do
    it "does not allow the same permission twice on one membership" do
      membership = create(:membership)
      permission = create(:permission)
      create(:membership_permission, membership: membership, permission: permission)

      duplicate = build(:membership_permission, membership: membership, permission: permission)

      expect(duplicate).not_to be_valid
    end

    it "allows the same permission on different memberships" do
      permission = create(:permission)
      create(:membership_permission, membership: create(:membership), permission: permission)

      other = build(:membership_permission, membership: create(:membership), permission: permission)

      expect(other).to be_valid
    end
  end
end
