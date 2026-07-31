module Memberships
  class List
    def call
      Membership.includes(:permissions).map { |membership| MembershipDto.from(membership) }
    end
  end
end
