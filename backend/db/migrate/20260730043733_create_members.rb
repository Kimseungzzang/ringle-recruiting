class CreateMembers < ActiveRecord::Migration[8.1]
  def change
    create_table :members do |t|
      t.string :login_id, null: false
      t.string :password_digest, null: false
      t.string :username, null: false
      t.datetime :deleted_at

      t.timestamps
    end
    add_index :members, :login_id, unique: true
  end
end
