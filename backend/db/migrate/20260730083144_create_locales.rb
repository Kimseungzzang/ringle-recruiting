class CreateLocales < ActiveRecord::Migration[8.1]
  def change
    create_table :locales do |t|
      t.string :name, null: false

      t.timestamps
    end
    add_index :locales, :name, unique: true
  end
end
