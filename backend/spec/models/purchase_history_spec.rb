require "rails_helper"

RSpec.describe PurchaseHistory, type: :model do
  describe "associations" do
    it { is_expected.to belong_to(:member) }
    it { is_expected.to belong_to(:membership) }
  end

  describe "validations" do
    subject { create(:purchase_history) }

    it { is_expected.to validate_presence_of(:source) }
    it { is_expected.to validate_presence_of(:state) }
    it { is_expected.to validate_numericality_of(:price_at_purchase).only_integer.is_greater_than_or_equal_to(0) }
  end

  describe "enums" do
    it { is_expected.to define_enum_for(:source).with_values(purchase: 0, cancel: 1, admin: 2) }
    it { is_expected.to define_enum_for(:state).with_values(pending: 0, completed: 1, failed: 2) }
  end

  describe ".record_order" do
    it "creates a pending purchase-source record" do
      member = create(:member)
      membership = create(:membership, price: 50_000)

      history = described_class.record_order(member: member, membership: membership, price: 50_000)

      expect(history).to be_persisted
      expect(history.source).to eq("purchase")
      expect(history.state).to eq("pending")
      expect(history.price_at_purchase).to eq(50_000)
    end
  end

  describe ".record_admin_grant" do
    it "creates a completed admin-source record" do
      history = described_class.record_admin_grant(member: create(:member), membership: create(:membership), price: 0)

      expect(history.source).to eq("admin")
      expect(history.state).to eq("completed")
      expect(history.price_at_purchase).to eq(0)
    end
  end

  describe ".record_cancel" do
    it "creates a completed cancel-source record" do
      history = described_class.record_cancel(member: create(:member), membership: create(:membership), price: 30_000)

      expect(history.source).to eq("cancel")
      expect(history.state).to eq("completed")
      expect(history.price_at_purchase).to eq(30_000)
    end
  end

  describe "#complete!" do
    it "sets state to completed" do
      history = create(:purchase_history, state: :pending)
      history.complete!
      expect(history.reload.state).to eq("completed")
    end
  end

  describe "#fail!" do
    it "sets state to failed" do
      history = create(:purchase_history, state: :pending)
      history.fail!
      expect(history.reload.state).to eq("failed")
    end
  end
end
