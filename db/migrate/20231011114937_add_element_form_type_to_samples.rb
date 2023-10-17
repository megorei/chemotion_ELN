class AddElementFormTypeToSamples < ActiveRecord::Migration[6.1]
  def change
    add_column :samples, :element_form_type_id, :integer
    add_index :samples, :element_form_type_id
  end
end
