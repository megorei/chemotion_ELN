# frozen_string_literal: true

# P1 WP 01 (REQ-ELN-16): minimal grant table backing the gated federated
# login. WP 02 (invitations/UI) grows this model; WP 01 only needs the gate
# semantics: does a pending/active grant exist for this identity?
#
#   federated_id  - "issuer#identifier"; nullable because an invitation may be
#                   issued by email before the identity's first login (the
#                   first login attaches/backfills it).
#   email         - invitation address; nullable once federated_id is known.
#   state         - pending | active | revoked.
#   collection_id - the shared target collection; nullable, wired by WP 02.
#   created_by    - inviting user (admin/owner), wired by WP 02.
class CreateGuestGrants < ActiveRecord::Migration[7.2]
  def change
    create_table :guest_grants do |t|
      t.string :federated_id
      t.string :email
      t.string :state, null: false, default: 'pending'
      t.integer :collection_id
      t.integer :created_by
      t.timestamps
    end

    add_index :guest_grants, :federated_id
    add_index :guest_grants, :email
    add_index :guest_grants, :state
  end
end
