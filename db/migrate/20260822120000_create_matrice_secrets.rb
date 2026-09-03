# frozen_string_literal: true

# WP 05 (REQ-ELN-5): dedicated encrypted store for secrets that used to live
# in plaintext inside the matrices.configs JSONB (OmniAuth client_secrets,
# computedProp hmac/receiving secrets, fastInput cas_api_key).
class CreateMatriceSecrets < ActiveRecord::Migration[7.2]
  def change
    create_table :matrice_secrets do |t|
      t.references :matrice, null: false, foreign_key: true, index: false
      t.string :key, null: false
      t.text :secret
      t.timestamps
    end
    add_index :matrice_secrets, %i[matrice_id key], unique: true
  end
end
