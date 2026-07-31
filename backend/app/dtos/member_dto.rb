MemberDto = Data.define(:id, :login_id, :username) do
  def self.from(member)
    new(
      id: member.id,
      login_id: member.login_id,
      username: member.username
    )
  end
end
