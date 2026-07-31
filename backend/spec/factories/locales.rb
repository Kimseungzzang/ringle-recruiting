FactoryBot.define do
  factory :locale do
    sequence(:name) { |n| "locale#{n}" }

    trait :ko do
      name { Locale::KO }
    end

    trait :eng do
      name { Locale::ENG }
    end
  end
end
