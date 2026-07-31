class DropTopicTranslations < ActiveRecord::Migration[8.1]
  def change
    # topic_translations(토픽당 언어 1개)는 topic_paragraphs +
    # topic_paragraph_translations(문단당 언어 1개)로 대체됨 — 한 토픽 안에
    # 순서 있는 여러 문단이 들어가고 문단마다 ko/eng이 쌍을 이뤄야 해서.
    drop_table :topic_translations do |t|
      t.references :topic, null: false, foreign_key: true
      t.references :locale, null: false, foreign_key: true
      t.text :content, null: false

      t.timestamps
    end
  end
end
