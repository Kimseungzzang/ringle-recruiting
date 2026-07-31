class RemovePermissionColumnsFromMemberships < ActiveRecord::Migration[8.1]
  def change
    remove_column :memberships, :can_study, :boolean, null: false, default: false
    remove_column :memberships, :can_converse, :boolean, null: false, default: false
    remove_column :memberships, :can_analyze, :boolean, null: false, default: false
  end
end
