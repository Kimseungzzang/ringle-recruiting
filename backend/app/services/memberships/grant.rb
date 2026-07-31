module Memberships
  class Grant
    # purchase_history: 기존 pending PurchaseHistory가 있으면 그걸 완료 처리
    # (Payments::Create의 order 단계에서 넘어옴). 없으면 어드민이 결제 없이
    # 즉시 부여하는 경우로 보고 새 완료 기록을 만든다.
    def initialize(member_id:, membership_id:, price_at_purchase:, purchase_history: nil)
      @member_id = member_id
      @membership_id = membership_id
      @price_at_purchase = price_at_purchase
      @purchase_history = purchase_history
      @retried = false
    end

    def call
      member = Member.active.find(@member_id)
      membership = Membership.find(@membership_id)

      member_membership = with_race_retry { grant_within_transaction(member, membership) }

      MemberMembershipDto.from(member_membership)
    end

    private

    def grant_within_transaction(member, membership)
      ActiveRecord::Base.transaction do
        # 이미 있는 row를 연장하는 경로는 락을 걸고 조회한다 — 안 그러면
        # 같은 회원에게 동시에 두 번 연장 요청(예: 중복 클릭, 어드민 부여와
        # 결제가 동시에 들어오는 경우)이 들어왔을 때 둘 다 같은 expires_at을
        # 읽어 계산하는 바람에 한쪽 연장이 유실될 수 있음(row가 아예 없어서
        # 두 INSERT가 경합하는 경우는 위 unique 제약 + with_race_retry로
        # 이미 처리됨 — 이건 그거랑 다른, "이미 있는 row" 갱신 경합).
        member_membership = MemberMembership.lock.find_by(member: member) ||
          MemberMembership.new(member: member)
        member_membership.grant!(membership)

        if @purchase_history
          @purchase_history.complete!
        else
          PurchaseHistory.record_admin_grant(member: member, membership: membership, price: @price_at_purchase)
        end

        member_membership
      end
    end

    # 동시에 같은 회원에게 두 번 부여/구매 요청이 들어오면 member_memberships의
    # member_id unique index가 두 번째 INSERT를 막아 RecordNotUnique가 발생함
    # — 이미 생긴 row를 다시 찾아 갱신하도록 한 번만 재시도한다.
    def with_race_retry
      yield
    rescue ActiveRecord::RecordNotUnique
      raise if @retried
      @retried = true
      retry
    end
  end
end
