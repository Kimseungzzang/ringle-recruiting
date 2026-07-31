class CreateMemberMemberships < ActiveRecord::Migration[8.1]
  def change
    create_table :member_memberships do |t|
      t.references :member, null: false, foreign_key: true, index: { unique: true }
      t.references :membership, null: false, foreign_key: true
      t.datetime :expires_at, null: false

      t.timestamps
    end
  end
end
