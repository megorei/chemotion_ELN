class CreateElementFormTypes < ActiveRecord::Migration[6.1]
  def change
    create_table :element_form_types do |t|
      t.string :name
      t.string :description
      t.string :element_type
      t.jsonb :structure, default: {}
      t.boolean :enabled
      t.integer :enabled_for
      t.integer :creator_id

      t.timestamps
    end
  end
end
