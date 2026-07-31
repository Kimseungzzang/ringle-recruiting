class AddStateToPurchaseHistories < ActiveRecord::Migration[8.1]
  def change
    add_column :purchase_histories, :state, :integer, null: false, default: 0
    add_index :purchase_histories, :state
  end
end
