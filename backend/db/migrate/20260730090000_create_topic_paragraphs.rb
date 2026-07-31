class CreateTopicParagraphs < ActiveRecord::Migration[8.1]
  def change
    create_table :topic_paragraphs do |t|
      t.references :topic, null: false, foreign_key: true
      t.integer :position, null: false

      t.timestamps
    end
    add_index :topic_paragraphs, [ :topic_id, :position ], unique: true
  end
end
