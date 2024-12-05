class CreateCollectionsMacromoleculeSample < ActiveRecord::Migration[6.1]
  def change
    create_table :collections_macromolecule_samples do |t|
      t.belongs_to :collection, foreign_key: true, index: { name: 'index_collection_macromolecule_samples_collection' }
      t.belongs_to :macromolecule_sample, foreign_key: true, index: { name: 'index_collection_macromolecule_samples_sample' }
      t.datetime :deleted_at, null: true, index: true
      t.timestamps
    end
    add_index :collections_macromolecule_samples, [:macromolecule_sample_id, :collection_id], unique: true, name: 'index_collection_macromolecule_samples_unique_joins'
  end
end
