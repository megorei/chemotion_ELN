# frozen_string_literal: true

# P1 WP 02 (REQ-ELN-17): a guest grant doubles as the pending invitation —
# it carries the exact share parameters (mirroring collection_shares) that
# the first-login conversion writes into the real CollectionShare row.
# Supersedes the separately planned pending_invitations table: WP 01 already
# pre-wired collection_id/created_by here.
class AddShareParamsToGuestGrants < ActiveRecord::Migration[7.2]
  DETAIL_LEVEL_COLUMNS = %i[
    celllinesample_detail_level
    devicedescription_detail_level
    element_detail_level
    reaction_detail_level
    researchplan_detail_level
    sample_detail_level
    screen_detail_level
    sequencebasedmacromoleculesample_detail_level
    wellplate_detail_level
  ].freeze

  def change
    change_table :guest_grants, bulk: true do |t|
      t.integer :permission_level, default: 0, null: false
      DETAIL_LEVEL_COLUMNS.each do |column|
        t.integer column, default: 0, null: false
      end
      t.datetime :expires_at
    end
  end
end
