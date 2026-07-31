require "rails_helper"

RSpec.describe Memberships::Grant do
  describe "#call" do
    it "부여된 멤버십 정보를 담은 DTO를 반환한다" do
      member = create(:member)
      membership = create(:membership)

      dto = described_class.new(
        member_id: member.id,
        membership_id: membership.id,
        price_at_purchase: membership.price
      ).call

      expect(dto).to be_a(MemberMembershipDto)
      expect(dto.membership.id).to eq(membership.id)
      expect(member.reload.member_membership).to be_present
    end

    it "purchase_history 없이 호출되면(관리자 부여) 완료 상태의 구매 이력을 새로 남긴다" do
      member = create(:member)
      membership = create(:membership)

      expect {
        described_class.new(
          member_id: member.id,
          membership_id: membership.id,
          price_at_purchase: membership.price
        ).call
      }.to change(PurchaseHistory, :count).by(1)

      purchase_history = PurchaseHistory.last
      expect(purchase_history.source).to eq("admin")
      expect(purchase_history.state).to eq("completed")
    end

    it "pending 구매 이력이 전달되면 새로 만들지 않고 완료 처리만 한다" do
      member = create(:member)
      membership = create(:membership)
      purchase_history = create(:purchase_history, member: member, membership: membership, state: :pending)

      expect {
        described_class.new(
          member_id: member.id,
          membership_id: membership.id,
          price_at_purchase: membership.price,
          purchase_history: purchase_history
        ).call
      }.not_to change(PurchaseHistory, :count)

      expect(purchase_history.reload.state).to eq("completed")
    end

    it "이미 활성 멤버십이 있고 같은 플랜을 재구매/재부여하면 기존 만료일로부터 연장한다" do
      member = create(:member)
      membership = create(:membership, duration_days: 20)
      member_membership = create(
        :member_membership, member: member, membership: membership, expires_at: 10.days.from_now
      )
      base_expires_at = member_membership.expires_at

      described_class.new(
        member_id: member.id,
        membership_id: membership.id,
        price_at_purchase: membership.price
      ).call

      expect(member_membership.reload.expires_at).to be_within(1.second).of(base_expires_at + 20.days)
    end

    it "이미 활성 멤버십이 있어도 다른 플랜으로 바뀌면 연장하지 않고 지금부터 새로 시작한다" do
      member = create(:member)
      old_membership = create(:membership, duration_days: 10)
      new_membership = create(:membership, duration_days: 20)
      create(:member_membership, member: member, membership: old_membership, expires_at: 10.days.from_now)

      travel_to Time.current do
        described_class.new(
          member_id: member.id,
          membership_id: new_membership.id,
          price_at_purchase: new_membership.price
        ).call

        expect(member.reload.member_membership.expires_at).to be_within(1.second).of(20.days.from_now)
      end
    end

    it "만료된 멤버십이 있으면 지금부터 새로 시작한다" do
      member = create(:member)
      old_membership = create(:membership, duration_days: 10)
      new_membership = create(:membership, duration_days: 20)
      member_membership = create(
        :member_membership, member: member, membership: old_membership, expires_at: 1.day.ago
      )

      travel_to Time.current do
        described_class.new(
          member_id: member.id,
          membership_id: new_membership.id,
          price_at_purchase: new_membership.price
        ).call

        expect(member_membership.reload.expires_at).to be_within(1.second).of(20.days.from_now)
      end
    end

    it "이미 존재하는 멤버십을 연장할 때는 락을 걸고 조회한다(동시 연장 유실 방지)" do
      member = create(:member)
      membership = create(:membership, duration_days: 10)
      create(:member_membership, member: member, membership: membership, expires_at: 10.days.from_now)

      allow(MemberMembership).to receive(:lock).and_call_original

      described_class.new(
        member_id: member.id,
        membership_id: membership.id,
        price_at_purchase: membership.price
      ).call

      expect(MemberMembership).to have_received(:lock)
    end

    it "동시 요청으로 인한 RecordNotUnique 발생 시 한 번 재시도해서 성공한다" do
      member = create(:member)
      membership = create(:membership)
      service = described_class.new(
        member_id: member.id,
        membership_id: membership.id,
        price_at_purchase: membership.price
      )
      original_method = service.method(:grant_within_transaction)
      call_count = 0
      allow(service).to receive(:grant_within_transaction) do |*args|
        call_count += 1
        raise ActiveRecord::RecordNotUnique, "duplicate key value violates unique constraint" if call_count == 1

        original_method.call(*args)
      end

      result = service.call

      expect(result).to be_a(MemberMembershipDto)
      expect(call_count).to eq(2)
    end

    it "재시도 후에도 계속 RecordNotUnique가 발생하면 예외를 그대로 전파한다" do
      member = create(:member)
      membership = create(:membership)
      service = described_class.new(
        member_id: member.id,
        membership_id: membership.id,
        price_at_purchase: membership.price
      )
      allow(service).to receive(:grant_within_transaction)
        .and_raise(ActiveRecord::RecordNotUnique, "duplicate key value violates unique constraint")

      expect { service.call }.to raise_error(ActiveRecord::RecordNotUnique)
    end
  end
end
