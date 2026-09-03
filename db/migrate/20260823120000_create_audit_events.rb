# frozen_string_literal: true

# WP 09 (§9 NFR Audit): one append-only structured event stream per tenant.
# No updated_at by design — rows are never updated (AuditEvent#readonly?).
class CreateAuditEvents < ActiveRecord::Migration[7.2]
  def change
    create_table :audit_events do |t|
      t.integer :actor_id
      t.string :actor_type, null: false
      t.string :action, null: false
      t.string :subject_type
      t.integer :subject_id
      t.jsonb :metadata, null: false, default: {}
      t.string :ip
      t.datetime :created_at, null: false
    end

    add_index :audit_events, :created_at
    add_index :audit_events, :actor_id
    add_index :audit_events, %i[subject_type subject_id]
  end
end
