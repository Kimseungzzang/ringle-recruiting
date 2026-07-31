class CreatePermissions < ActiveRecord::Migration[8.1]
  def change
    create_table :permissions do |t|
      t.string :name, null: false

      t.timestamps
    end
    add_index :permissions, :name, unique: true
  end
end
