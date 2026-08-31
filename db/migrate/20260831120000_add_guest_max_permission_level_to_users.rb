# frozen_string_literal: true

# P1 WP 06 (REQ-ELN-20c): per-group restriction of the guest write-escalation
# cap. Used on Group STI rows only; nil = inherit the tenant policy. A group
# value can only restrict (never extend) the tenant allowance — enforced in
# GuestPolicy, which takes the minimum across grantor group caps.
class AddGuestMaxPermissionLevelToUsers < ActiveRecord::Migration[7.2]
  def change
    add_column :users, :guest_max_permission_level, :integer, null: true
  end
end
