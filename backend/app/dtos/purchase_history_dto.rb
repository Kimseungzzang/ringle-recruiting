PurchaseHistoryDto = Data.define(:id, :membership, :source, :state, :price_at_purchase, :created_at) do
  def self.from(purchase_history)
    new(
      id: purchase_history.id,
      membership: MembershipDto.from(purchase_history.membership),
      source: purchase_history.source,
      state: purchase_history.state,
      price_at_purchase: purchase_history.price_at_purchase,
      created_at: purchase_history.created_at
    )
  end
end
