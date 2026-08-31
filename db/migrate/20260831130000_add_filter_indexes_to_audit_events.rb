# frozen_string_literal: true

# P1 WP 05: the admin events API filters primarily by action and actor_type —
# neither was indexed (P0 WP 09 only indexed created_at/actor_id/subject).
class AddFilterIndexesToAuditEvents < ActiveRecord::Migration[7.2]
  def change
    add_index :audit_events, :action
    add_index :audit_events, :actor_type
  end
end
