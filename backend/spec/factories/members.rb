FactoryBot.define do
  factory :member do
    sequence(:login_id) { |n| "member_login_#{n}" }
    password { "password123" }
    sequence(:username) { |n| "회원#{n}" }
    role { :user }

    trait :admin do
      role { :admin }
    end
  end
end
