# frozen_string_literal: true

module Entities
  class AuditEventEntity < Grape::Entity
    expose :id, documentation: { type: 'Integer' }
    expose :action, documentation: { type: 'String', desc: 'domain.past_tense_verb' }
    expose :actor_type, documentation: { type: 'String', desc: 'user | guest | system' }
    expose :actor_id, documentation: { type: 'Integer' }
    expose :actor_name, documentation: { type: 'String', desc: 'resolved display name (guests marked)' }
    expose :subject_type, documentation: { type: 'String' }
    expose :subject_id, documentation: { type: 'Integer' }
    expose :metadata, documentation: { type: 'Hash' }
    expose :ip, documentation: { type: 'String' }
    expose :created_at, documentation: { type: 'DateTime' }

    def actor_name
      return 'system' if object.actor_type == 'system'
      return nil if object.actor_id.blank?

      user = options[:actors]&.[](object.actor_id)
      return nil unless user

      user.external ? "#{user.name} (guest)" : user.name
    end
  end
end
