class RemoveContentFromTopics < ActiveRecord::Migration[8.1]
  def change
    remove_column :topics, :content, :text, null: false
  end
end
