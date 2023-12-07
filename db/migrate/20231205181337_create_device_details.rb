class CreateDeviceDetails < ActiveRecord::Migration[6.1]
  def change
    create_table :device_details do |t|
      t.integer :device_id
      t.string :serial_number
      t.integer :user_ids, array: true, default: []
      t.string :verification_status, default: 'none'
      t.boolean :active, default: false
      t.boolean :visibility, default: false
      t.timestamps
    end
    add_index :device_details, :device_id
  end
end
