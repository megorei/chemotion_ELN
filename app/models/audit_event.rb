# frozen_string_literal: true

# WP 09 (§9 NFR Audit): append-only structured event stream — "wer hat was
# geändert/worauf zugegriffen". One row per event; rows are frozen after
# create (no updates, no deletes — deliberately NOT paranoid: an audit trail
# that can be soft-deleted is not an audit trail). Retention/rotation is a
# tenant-config concern (WP 03 resolver) and happens via plain SQL deletes by
# an operator task, not through this model.
#
# P1 contract (REQ-ELN-20 guest audit): guest events reuse this table with
# actor_type 'guest' and a nil actor_id (guests have no users row); the guest
# identity/token hint goes into metadata. No migration needed for P1.
class AuditEvent < ApplicationRecord
  ACTOR_TYPES = %w[user guest system].freeze

  validates :action, presence: true
  validates :actor_type, presence: true, inclusion: { in: ACTOR_TYPES }

  # Append-only: persisted rows reject update/destroy with ReadOnlyRecord.
  def readonly?
    !new_record?
  end

  class << self
    # The one emitter. Never raises into the caller — audit must not break the
    # business flow (failures are logged and swallowed).
    #
    #   actor:   User instance | Integer user id | :system | :guest | nil
    #            (nil = unauthenticated/unknown human, e.g. a failed login)
    #   subject: ActiveRecord instance | [type, id] pair | nil
    #   meta:    Hash, stored as jsonb; the tenant id (TenantContext) is
    #            stamped in automatically as metadata['tenant'] when set.
    def record(action:, actor: nil, subject: nil, meta: {}, ip: nil)
      create!(
        action: action,
        ip: ip,
        metadata: metadata_with_tenant(meta),
        **actor_attributes(actor),
        **subject_attributes(subject),
      )
    rescue StandardError => e
      Rails.logger.warn("AuditEvent.record failed (action=#{action}): #{e.class}: #{e.message}")
      nil
    end

    private

    def metadata_with_tenant(meta)
      meta = meta.presence || {}
      tenant = TenantContext.current.id
      tenant ? meta.merge(tenant: tenant) : meta
    end

    def actor_attributes(actor)
      case actor
      when User then { actor_id: actor.id, actor_type: 'user' }
      when Integer then { actor_id: actor, actor_type: 'user' }
      when :system then { actor_id: nil, actor_type: 'system' }
      when :guest then { actor_id: nil, actor_type: 'guest' }
      when nil then { actor_id: nil, actor_type: 'user' }
      else raise ArgumentError, "unsupported actor: #{actor.inspect}"
      end
    end

    def subject_attributes(subject)
      case subject
      when ActiveRecord::Base then { subject_type: subject.class.name, subject_id: subject.id }
      when Array then { subject_type: subject[0].to_s, subject_id: subject[1] }
      when nil then {}
      else raise ArgumentError, "unsupported subject: #{subject.inspect}"
      end
    end
  end
end
