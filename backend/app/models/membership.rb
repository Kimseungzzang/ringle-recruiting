class Membership < ApplicationRecord
  has_many :member_memberships, dependent: :restrict_with_error
  has_many :purchase_histories, dependent: :restrict_with_error
  has_many :membership_permissions, dependent: :destroy
  has_many :permissions, through: :membership_permissions

  validates :name, presence: true, uniqueness: true
  validates :duration_days, numericality: { only_integer: true, greater_than: 0 }
  validates :price, numericality: { only_integer: true, greater_than_or_equal_to: 0 }

  def permission?(name)
    permissions.exists?(name: name.to_s)
  end
end
