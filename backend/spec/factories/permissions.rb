FactoryBot.define do
  factory :permission do
    sequence(:name) { |n| "permission#{n}" }

    trait :study do
      name { Permission::STUDY }
    end

    trait :converse do
      name { Permission::CONVERSE }
    end

    trait :analyze do
      name { Permission::ANALYZE }
    end
  end
end
