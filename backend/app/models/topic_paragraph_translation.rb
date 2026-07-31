class TopicParagraphTranslation < ApplicationRecord
  belongs_to :topic_paragraph
  belongs_to :locale

  validates :content, presence: true
  validates :locale_id, uniqueness: { scope: :topic_paragraph_id }
end
