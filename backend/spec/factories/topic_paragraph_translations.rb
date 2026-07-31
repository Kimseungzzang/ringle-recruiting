FactoryBot.define do
  factory :topic_paragraph_translation do
    topic_paragraph
    locale
    content { "번역 내용" }
  end
end
