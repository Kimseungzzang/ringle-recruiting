MemberMembershipDto = Data.define(:membership, :created_at, :expires_at, :active) do
  def self.from(member_membership)
    new(
      membership: MembershipDto.from(member_membership.membership),
      created_at: member_membership.created_at,
      expires_at: member_membership.expires_at,
      active: member_membership.active?
    )
  end
end
