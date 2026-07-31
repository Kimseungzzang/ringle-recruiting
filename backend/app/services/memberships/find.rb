module Memberships
  class Find
    def initialize(id:)
      @id = id
    end

    def call
      MembershipDto.from(Membership.includes(:permissions).find(@id))
    end
  end
end
