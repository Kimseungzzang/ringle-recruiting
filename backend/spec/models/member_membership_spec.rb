require "rails_helper"

RSpec.describe MemberMembership, type: :model do
  describe "associations" do
    it { is_expected.to belong_to(:member) }
    it { is_expected.to belong_to(:membership) }
  end

  describe "validations" do
    subject { create(:member_membership) }

    it { is_expected.to validate_uniqueness_of(:member_id) }
  end

  describe "#active?" do
    it "is true when expires_at is in the future" do
      expect(build(:member_membership, expires_at: 1.day.from_now).active?).to eq(true)
    end

    it "is false when expires_at is in the past" do
      expect(build(:member_membership, expires_at: 1.day.ago).active?).to eq(false)
    end
  end

  describe "#grant!" do
    it "starts from now when there is no prior membership" do
      freeze_time do
        member_membership = build(:member_membership, expires_at: nil)
        membership = create(:membership, duration_days: 30)

        member_membership.grant!(membership)

        expect(member_membership.expires_at).to eq(30.days.from_now)
      end
    end

    it "extends from the current expiry when repurchasing the same plan while still active" do
      freeze_time do
        membership = create(:membership, duration_days: 30)
        member_membership = create(:member_membership, membership: membership, expires_at: 10.days.from_now)

        member_membership.grant!(membership)

        expect(member_membership.expires_at).to eq(40.days.from_now)
      end
    end

    it "starts from now (does not extend) when switching to a different plan while still active" do
      freeze_time do
        member_membership = create(:member_membership, expires_at: 10.days.from_now)
        different_membership = create(:membership, duration_days: 30)

        member_membership.grant!(different_membership)

        expect(member_membership.expires_at).to eq(30.days.from_now)
      end
    end

    it "starts from now when the prior membership already expired" do
      freeze_time do
        member_membership = create(:member_membership, expires_at: 1.day.ago)
        membership = create(:membership, duration_days: 30)

        member_membership.grant!(membership)

        expect(member_membership.expires_at).to eq(30.days.from_now)
      end
    end

    it "updates the membership association" do
      member_membership = create(:member_membership)
      new_membership = create(:membership)

      member_membership.grant!(new_membership)

      expect(member_membership.membership).to eq(new_membership)
    end
  end
end
