FactoryBot.define do
  factory :topic_paragraph do
    topic
    sequence(:position) { |n| n - 1 }
  end
end
