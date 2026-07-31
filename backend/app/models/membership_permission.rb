class MembershipPermission < ApplicationRecord
  belongs_to :membership
  belongs_to :permission

  validates :permission_id, uniqueness: { scope: :membership_id }
end
