# frozen_string_literal: true

# P2 WP 01 (REQ-ELN-22, 21c): origin/copy markers on copyable elements.
# Append-only like AuditEvent — no paranoia, no logidze, rows are never
# updated. The unique index over (element, direction, remote_ref) is the
# idempotency guarantee for re-imports (WP 02).
class Provenance < ApplicationRecord
  DIRECTIONS = %w[origin copy].freeze

  belongs_to :element, polymorphic: true
  belongs_to :actor, class_name: 'User', optional: true

  validates :direction, inclusion: { in: DIRECTIONS }
  validates :remote_ref, presence: true

  scope :origins, -> { where(direction: 'origin') }
  scope :copies, -> { where(direction: 'copy') }

  def readonly?
    persisted?
  end

  def ref
    ProvenanceRef.parse(remote_ref)
  end
end
