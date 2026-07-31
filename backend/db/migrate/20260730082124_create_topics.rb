class CreateTopics < ActiveRecord::Migration[8.1]
  def change
    create_table :topics do |t|
      t.string :title, null: false
      t.text :content, null: false
      t.datetime :deleted_at

      t.timestamps
    end
  end
end
