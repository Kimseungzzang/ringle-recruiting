class CreateTopicTranslations < ActiveRecord::Migration[8.1]
  def change
    create_table :topic_translations do |t|
      t.references :topic, null: false, foreign_key: true
      t.references :locale, null: false, foreign_key: true
      t.text :content, null: false

      t.timestamps
    end
    add_index :topic_translations, [ :topic_id, :locale_id ], unique: true, name: "index_topic_translations_on_topic_and_locale"
  end
end
