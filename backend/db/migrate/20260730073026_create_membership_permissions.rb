class CreateMembershipPermissions < ActiveRecord::Migration[8.1]
  def change
    create_table :membership_permissions do |t|
      t.references :membership, null: false, foreign_key: true
      t.references :permission, null: false, foreign_key: true

      t.timestamps
    end
    add_index :membership_permissions, [ :membership_id, :permission_id ], unique: true, name: "index_membership_permissions_on_membership_and_permission"
  end
end
