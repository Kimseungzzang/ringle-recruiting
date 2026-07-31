module Members
  class List
    def call
      Member.active
            .includes(member_membership: { membership: :permissions })
            .order(:id)
            .map { |member| MemberDetailDto.from(member) }
    end
  end
end
