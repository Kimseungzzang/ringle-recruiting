class Permission < ApplicationRecord
  STUDY = "study"
  CONVERSE = "converse"
  ANALYZE = "analyze"

  has_many :membership_permissions, dependent: :restrict_with_error
  has_many :memberships, through: :membership_permissions

  validates :name, presence: true, uniqueness: true
end
