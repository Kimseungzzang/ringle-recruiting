FactoryBot.define do
  factory :topic do
    sequence(:title) { |n| "주제#{n}" }
    sequence(:title_en) { |n| "Topic #{n}" }
  end
end
