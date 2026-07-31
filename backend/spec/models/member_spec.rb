require "rails_helper"

RSpec.describe Member, type: :model do
  describe "associations" do
    it { is_expected.to have_one(:member_membership).dependent(:destroy) }
    it { is_expected.to have_many(:purchase_histories).dependent(:destroy) }
  end

  describe "validations" do
    subject { create(:member) }

    it { is_expected.to validate_presence_of(:login_id) }
    it { is_expected.to validate_uniqueness_of(:login_id) }
    it { is_expected.to validate_length_of(:login_id).is_at_least(10) }
    it { is_expected.to validate_presence_of(:username) }
    it { is_expected.to validate_length_of(:password).is_at_least(10) }
  end

  describe "role" do
    it "defaults to user" do
      expect(create(:member).role).to eq("user")
    end

    it "accepts admin" do
      expect(create(:member, :admin).role).to eq("admin")
    end
  end

  describe "#authenticate" do
    it "returns the member for the correct password" do
      member = create(:member, password: "correct-password")
      expect(member.authenticate("correct-password")).to eq(member)
    end

    it "returns false for the wrong password" do
      member = create(:member, password: "correct-password")
      expect(member.authenticate("wrong")).to eq(false)
    end
  end

  describe ".active" do
    it "excludes soft-deleted members" do
      active_member = create(:member)
      deleted_member = create(:member, deleted_at: Time.current)

      expect(Member.active).to include(active_member)
      expect(Member.active).not_to include(deleted_member)
    end
  end

  describe "#deleted?" do
    it "is true when deleted_at is present" do
      expect(build(:member, deleted_at: Time.current).deleted?).to eq(true)
    end

    it "is false when deleted_at is nil" do
      expect(build(:member, deleted_at: nil).deleted?).to eq(false)
    end
  end
end
