class AddExtraFieldsToMd < ActiveRecord::Migration
  def change
    add_column :device_metadata, :data_cite_state, :string
    add_column :device_metadata, :data_cite_creator_name, :string
  end
end
