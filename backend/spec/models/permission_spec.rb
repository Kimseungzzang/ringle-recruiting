require "rails_helper"

RSpec.describe Permission, type: :model do
  describe "associations" do
    it { is_expected.to have_many(:membership_permissions).dependent(:restrict_with_error) }
    it { is_expected.to have_many(:memberships).through(:membership_permissions) }
  end

  describe "validations" do
    subject { create(:permission) }

    it { is_expected.to validate_presence_of(:name) }
    it { is_expected.to validate_uniqueness_of(:name) }
  end
end
