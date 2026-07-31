FactoryBot.define do
  factory :membership do
    sequence(:name) { |n| "멤버십#{n}" }
    duration_days { 30 }
    price { 100_000 }
  end
end
