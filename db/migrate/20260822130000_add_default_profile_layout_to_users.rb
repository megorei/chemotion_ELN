# frozen_string_literal: true

# WP 07 (REQ-ELN-14): a group admin may set a default UI layout for their
# group. Groups are STI rows on the users table, so the jsonb column lives
# there; it is only ever written for type = 'Group' rows (GroupSettingsAPI)
# and stays NULL everywhere else — single-tenant behaviour is unchanged as
# long as no group default is set.
class AddDefaultProfileLayoutToUsers < ActiveRecord::Migration[7.2]
  def change
    add_column :users, :default_profile_layout, :jsonb, null: true
  end
end
