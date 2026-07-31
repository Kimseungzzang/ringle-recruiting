FactoryBot.define do
  factory :member_membership do
    member
    membership
    expires_at { 30.days.from_now }
  end
end
