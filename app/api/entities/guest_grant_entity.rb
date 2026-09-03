# frozen_string_literal: true

module Entities
  # P1 WP 02 (REQ-ELN-17): an external invitation / guest grant as the share
  # dialog sees it. Exposes the invited identity and the pending share
  # parameters; converted?/user resolution stays server-side.
  class GuestGrantEntity < ApplicationEntity
    expose! :id
    expose! :collection_id
    expose! :federated_id
    expose! :email
    expose! :state
    expose! :expires_at
    expose! :permission_level
    expose! :celllinesample_detail_level
    expose! :devicedescription_detail_level
    expose! :element_detail_level
    expose! :reaction_detail_level
    expose! :researchplan_detail_level
    expose! :sample_detail_level
    expose! :screen_detail_level
    expose! :sequencebasedmacromoleculesample_detail_level
    expose! :wellplate_detail_level
  end
end
