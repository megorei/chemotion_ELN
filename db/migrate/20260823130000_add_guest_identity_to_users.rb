# frozen_string_literal: true

# P1 WP 01 (REQ-ELN-16): stable federated identity on users.
#
#   federated_id     - "issuer#identifier" (eppn / ORCID iD / OIDC sub), the
#                      stable key for federated identities; email is a mutable
#                      IdP attribute and must not key the identity.
#   external         - guest marker: a federated identity whose home is another
#                      tenant/institution (Person + flag, per WP 01 decision).
#   home_tenant_hint - display-only hint where the guest's home instance lives.
class AddGuestIdentityToUsers < ActiveRecord::Migration[7.2]
  def change
    change_table :users, bulk: true do |t|
      t.string :federated_id
      t.boolean :external, default: false, null: false
      t.string :home_tenant_hint
    end

    add_index :users, :federated_id, unique: true, where: 'federated_id IS NOT NULL'
  end
end
