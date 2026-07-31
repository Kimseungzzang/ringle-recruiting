class Member < ApplicationRecord
  has_secure_password

  enum :role, { user: 0, admin: 1 }, default: :user

  has_one :member_membership, dependent: :destroy
  has_many :purchase_histories, dependent: :destroy

  validates :login_id, presence: true, uniqueness: true, length: { minimum: 10 }
  validates :username, presence: true
  # has_secure_password가 이미 생성 시 password 존재 여부를 검증하므로,
  # 여기서는 값이 있을 때만(비밀번호를 바꾸지 않는 업데이트 포함) 길이를 검사.
  validates :password, length: { minimum: 10 }, allow_nil: true

  scope :active, -> { where(deleted_at: nil) }

  def deleted?
    deleted_at.present?
  end
end
