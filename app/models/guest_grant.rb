# frozen_string_literal: true

# == Schema Information
#
# Table name: guest_grants
#
#  id            :bigint           not null, primary key
#  email         :string
#  federated_id  :string
#  state         :string           default("pending"), not null
#  created_at    :datetime         not null
#  updated_at    :datetime         not null
#  collection_id :integer
#  created_by    :integer
#
# Indexes
#
#  index_guest_grants_on_email         (email)
#  index_guest_grants_on_federated_id  (federated_id)
#  index_guest_grants_on_state         (state)
#
# P1 WP 01/02 (REQ-ELN-16/17): a grant is the admission ticket for a
# federated guest identity AND the pending invitation carrying the share
# parameters. The gated OmniAuth login only provisions/admits identities
# holding a redeemable grant; on login every redeemable grant with a
# collection converts into a real CollectionShare
# (Usecases::Guests::RedeemGrants).
#
# States: pending (invited, not yet logged in) -> active (first login) ->
# revoked (deprovisioned; the guest account is disabled once its last usable
# grant is revoked). An expires_at in the past makes a grant non-redeemable
# without a state change.
#
# Deprovisioning (acl-deep-dive): collection_shares resolve shared_with via
# `with_deleted` — disabling or soft-deleting the guest user does NOT remove
# their shares. #revoke! therefore destroys the converted share explicitly
# before closing the login door.
class GuestGrant < ApplicationRecord
  STATES = %w[pending active revoked].freeze
  USABLE_STATES = %w[pending active].freeze

  # The share parameters a grant carries into the CollectionShare it converts
  # to on redemption (WP 02, REQ-ELN-17) — the exact collection_shares mirror.
  SHARE_PARAM_COLUMNS = %i[
    permission_level
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

  belongs_to :collection, optional: true
  belongs_to :creator, class_name: 'User', foreign_key: :created_by, optional: true, inverse_of: false

  before_validation { self.email = email.to_s.downcase.presence }

  validates :state, presence: true, inclusion: { in: STATES }
  validates :permission_level, presence: true,
                               numericality: { only_integer: true, greater_than_or_equal_to: 0 }
  validate :identity_present

  scope :usable, -> { where(state: USABLE_STATES) }
  scope :not_expired, -> { where(expires_at: nil).or(where(expires_at: Time.current..)) }
  # The grants an identity may still act on: usable AND not expired. Expiry
  # gates both the login door (find_usable) and share conversion (WP 02:
  # "expired invitations ignored").
  scope :redeemable, -> { usable.not_expired }

  # Gate lookup: the stable federated identifier wins; the email fallback only
  # matches detached grants (invitation issued before the first login) — a
  # grant already attached to another federated_id belongs to that identity.
  # Expired invitations no longer open the door.
  def self.find_usable(federated_id:, email: nil)
    if federated_id.present?
      grant = redeemable.find_by(federated_id: federated_id)
      return grant if grant
    end
    return if email.blank?

    redeemable.where(federated_id: nil).find_by(email: email.downcase)
  end

  # P1 WP 05: the expired counterpart of find_usable — the grant that WOULD
  # have opened the door had it not expired. Expiry is observed lazily at
  # login time (deliberately no sweeper); the interesting signal is "someone
  # tried to use an expired invitation".
  def self.find_expired(federated_id:, email: nil)
    expired = usable.where(expires_at: ...Time.current)
    if federated_id.present?
      grant = expired.find_by(federated_id: federated_id)
      return grant if grant
    end
    return if email.blank?

    expired.where(federated_id: nil).find_by(email: email.downcase)
  end

  # Every redeemable grant belonging to +user+'s identity: attached by
  # federated_id, plus detached email invitations issued before this login.
  def self.redeemable_for(user)
    redeemable.where(federated_id: user.federated_id)
              .or(redeemable.where(federated_id: nil, email: user.email.to_s.downcase))
  end

  def usable?
    USABLE_STATES.include?(state)
  end

  def expired?
    expires_at.present? && expires_at.past?
  end

  # The attribute hash for the CollectionShare this grant converts into.
  def share_attributes
    attributes.symbolize_keys.slice(*SHARE_PARAM_COLUMNS)
  end

  # First-login backfill: bind the invitation to the identity that redeemed it.
  def attach!(federated_id:, email: nil)
    self.federated_id = federated_id if self.federated_id.blank?
    self.email = email if self.email.blank?
    save!
  end

  def activate!
    update!(state: 'active')
  end

  # Deprovision: revoke the converted share (WP 02 closes the acl-deep-dive
  # gap — collection_shares resolve with_deleted, so nothing else would) and
  # close the login door. Disables the guest account when this was its last
  # usable grant.
  def revoke!(by: nil)
    transaction do
      update!(state: 'revoked')
      revoke_converted_share
    end
    user = disable_orphaned_guest
    AuditEvent.record(
      action: 'guest.revoked',
      actor: by,
      subject: self,
      meta: { federated_id: federated_id, email: email, user_id: user&.id, collection_id: collection_id },
    )
  end

  private

  # Destroys the CollectionShare this grant converted into (if any) and
  # refreshes the collection's shared flag. A share held by a different
  # identity than this grant's is never touched.
  def revoke_converted_share
    return if collection_id.blank? || federated_id.blank?

    user = User.find_by(federated_id: federated_id)
    return if user.nil?

    CollectionShare.where(collection_id: collection_id, shared_with_id: user.id).destroy_all
    collection&.update!(shared: CollectionShare.exists?(collection_id: collection_id))
  end

  def disable_orphaned_guest
    return if federated_id.blank?

    user = User.find_by(federated_id: federated_id)
    return unless user&.external?

    user.update!(account_active: false) if self.class.usable.where(federated_id: federated_id).none?
    user
  end

  def identity_present
    return if federated_id.present? || email.present?

    errors.add(:base, 'either federated_id or email must be present')
  end
end
