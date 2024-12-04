class CreateCollectionsMacromoleculeSample < ActiveRecord::Migration[6.1]
  def change
    create_table :collections_macromolecule_samples do |t|
      t.belongs_to :collection, foreign_key: true, index: true
      t.belongs_to :macromolecule_sample, foreign_key: true, index: true
      t.datetime :deleted_at, null: true, index: true
      t.timestamps
    end
    add_index :collections_macromolecule_samples, [:macromolecule_sample_id, :collection_id], unique: true
  end
end
