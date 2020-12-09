class AddSomeFieldsToMetadata < ActiveRecord::Migration
  def change
    add_column :device_metadata, :data_cite_last_response, :jsonb, default: { }
    add_column :device_metadata, :data_cite_created_at, :datetime
    add_column :device_metadata, :data_cite_updated_at, :datetime
    add_column :device_metadata, :data_cite_version, :integer
  end
end
