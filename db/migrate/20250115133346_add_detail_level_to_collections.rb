class AddDetailLevelToCollections < ActiveRecord::Migration[6.1]
  def change
    add_column :collections, :macromoleculesample_detail_level, :integer, default: 10
    add_column :sync_collections_users, :macromoleculesample_detail_level, :integer, default: 10
  end
end
