FactoryBot.define do
  factory :purchase_history do
    member
    membership
    source { :purchase }
    state { :completed }
    price_at_purchase { 100_000 }
  end
end
