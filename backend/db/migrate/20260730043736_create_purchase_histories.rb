class CreatePurchaseHistories < ActiveRecord::Migration[8.1]
  def change
    create_table :purchase_histories do |t|
      t.references :member, null: false, foreign_key: true
      t.references :membership, null: false, foreign_key: true
      t.integer :source, null: false, default: 0
      t.integer :price_at_purchase, null: false

      t.timestamps
    end
    add_index :purchase_histories, :source
  end
end
