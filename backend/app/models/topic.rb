class Topic < ApplicationRecord
  has_many :topic_paragraphs, -> { order(:position) }, dependent: :destroy
  has_many :topic_paragraph_translations, through: :topic_paragraphs
  has_many :locales, through: :topic_paragraph_translations

  validates :title, presence: true
  validates :title_en, presence: true

  scope :active, -> { where(deleted_at: nil) }

  def deleted?
    deleted_at.present?
  end
end
