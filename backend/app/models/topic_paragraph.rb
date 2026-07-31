class TopicParagraph < ApplicationRecord
  belongs_to :topic
  has_many :topic_paragraph_translations, dependent: :destroy
  has_many :locales, through: :topic_paragraph_translations

  validates :position, presence: true,
                        uniqueness: { scope: :topic_id },
                        numericality: { only_integer: true, greater_than_or_equal_to: 0 }
end
