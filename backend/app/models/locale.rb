class Locale < ApplicationRecord
  # Permission과 동일하게 "enum 대신 카탈로그 테이블" 구조 — 언어가 나중에
  # 늘어나도 컬럼/마이그레이션 없이 seed row만 추가하면 됨.
  KO = "ko"
  ENG = "eng"

  has_many :topic_paragraph_translations, dependent: :restrict_with_error
  has_many :topic_paragraphs, through: :topic_paragraph_translations
  has_many :topics, through: :topic_paragraphs

  validates :name, presence: true, uniqueness: true
end
