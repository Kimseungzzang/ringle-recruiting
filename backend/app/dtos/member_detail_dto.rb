MemberDetailDto = Data.define(:id, :login_id, :username, :role, :membership) do
  def self.from(member)
    new(
      id: member.id,
      login_id: member.login_id,
      username: member.username,
      role: member.role,
      membership: member.member_membership && MemberMembershipDto.from(member.member_membership)
    )
  end
end
