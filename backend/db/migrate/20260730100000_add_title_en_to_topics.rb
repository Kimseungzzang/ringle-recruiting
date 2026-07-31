class AddTitleEnToTopics < ActiveRecord::Migration[8.1]
  def up
    add_column :topics, :title_en, :string
    # 기존 row 백필 — 실제 값은 db/seeds.rb 재실행 시 덮어써짐.
    Topic.reset_column_information
    Topic.update_all(title_en: "Untitled")
    change_column_null :topics, :title_en, false
  end

  def down
    remove_column :topics, :title_en
  end
end
