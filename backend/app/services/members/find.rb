module Members
  class Find
    def initialize(id:)
      @id = id
    end

    def call
      member = Member.active.includes(member_membership: { membership: :permissions }).find(@id)
      MemberDetailDto.from(member)
    end
  end
end
