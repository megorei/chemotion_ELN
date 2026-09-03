# frozen_string_literal: true

# WP 03 (REQ-ELN-31): DB tier of the central config resolver (AppConfig).
#
# tenant_settings holds the per-tenant overrides for the delegated
# (REQ-ELN-7 / inventory §0) config sections; `key` is the dot-joined path
# inside the section (same convention as matrice_secrets), `value` is the
# raw JSON value (scalar or subtree).
#
# tenant_setting_secrets is the encrypted sibling for secret-valued keys
# (smtp password, radar client_secret, converter secret_key, datacite
# api_password, ...) — same pattern as matrice_secrets (WP 05): secrets never
# live in tenant_settings.value plaintext.
class CreateTenantSettings < ActiveRecord::Migration[7.2]
  def change
    create_table :tenant_settings do |t|
      t.string :section, null: false
      t.string :key, null: false
      t.jsonb :value
      t.bigint :updated_by
      t.timestamps
    end
    add_index :tenant_settings, %i[section key], unique: true
    add_foreign_key :tenant_settings, :users, column: :updated_by

    create_table :tenant_setting_secrets do |t|
      t.string :section, null: false
      t.string :key, null: false
      t.text :secret
      t.bigint :updated_by
      t.timestamps
    end
    add_index :tenant_setting_secrets, %i[section key], unique: true
    add_foreign_key :tenant_setting_secrets, :users, column: :updated_by
  end
end
