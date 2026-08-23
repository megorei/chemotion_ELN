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
# P1 WP 01 (REQ-ELN-16): a grant is the admission ticket for a federated
# guest identity. The gated OmniAuth login only provisions/admits identities
# holding a pending or active grant. Minimal model by design — WP 02
# (invitations, sharing UI) wires collection_id/created_by and the lifecycle
# around it.
#
# States: pending (invited, not yet logged in) -> active (first login) ->
# revoked (deprovisioned; the guest account is disabled once its last usable
# grant is revoked).
#
# ⚠️ Deprovisioning caveat (acl-deep-dive): collection_shares resolve
# shared_with via `with_deleted` — disabling or soft-deleting the guest user
# does NOT remove their shares. Revoking the actual shares is explicit
# WP 02/03 scope; #revoke! here only closes the login door.
class GuestGrant < ApplicationRecord
  STATES = %w[pending active revoked].freeze
  USABLE_STATES = %w[pending active].freeze

  belongs_to :collection, optional: true
  belongs_to :creator, class_name: 'User', foreign_key: :created_by, optional: true, inverse_of: false

  before_validation { self.email = email.to_s.downcase.presence }

  validates :state, presence: true, inclusion: { in: STATES }
  validate :identity_present

  scope :usable, -> { where(state: USABLE_STATES) }

  # Gate lookup: the stable federated identifier wins; the email fallback only
  # matches detached grants (invitation issued before the first login) — a
  # grant already attached to another federated_id belongs to that identity.
  def self.find_usable(federated_id:, email: nil)
    if federated_id.present?
      grant = usable.find_by(federated_id: federated_id)
      return grant if grant
    end
    return if email.blank?

    usable.where(federated_id: nil).find_by(email: email.downcase)
  end

  def usable?
    USABLE_STATES.include?(state)
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

  # Deprovision: close the login door. Disables the guest account when this
  # was its last usable grant. Shares survive (with_deleted, see above) and
  # must be revoked explicitly (WP 02/03).
  def revoke!(by: nil)
    update!(state: 'revoked')
    user = disable_orphaned_guest
    AuditEvent.record(
      action: 'guest.revoked',
      actor: by,
      subject: self,
      meta: { federated_id: federated_id, email: email, user_id: user&.id },
    )
  end

  private

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
