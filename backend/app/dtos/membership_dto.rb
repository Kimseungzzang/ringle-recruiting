MembershipDto = Data.define(:id, :name, :permissions, :duration_days, :price) do
  def self.from(membership)
    new(
      id: membership.id,
      name: membership.name,
      permissions: membership.permissions.map(&:name).sort,
      duration_days: membership.duration_days,
      price: membership.price
    )
  end
end
