class CreateTopicParagraphTranslations < ActiveRecord::Migration[8.1]
  def change
    create_table :topic_paragraph_translations do |t|
      t.references :topic_paragraph, null: false, foreign_key: true
      t.references :locale, null: false, foreign_key: true
      t.text :content, null: false

      t.timestamps
    end
    add_index :topic_paragraph_translations, [ :topic_paragraph_id, :locale_id ],
      unique: true, name: "index_topic_paragraph_translations_on_paragraph_and_locale"
  end
end
