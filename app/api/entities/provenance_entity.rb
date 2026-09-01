# frozen_string_literal: true

module Entities
  # P2 WP 01 (REQ-ELN-22, 21c): origin/copy markers on elements — inert
  # metadata, exposed at detail level 0 (a low-detail sharee still sees
  # where content came from).
  class ProvenanceEntity < Grape::Entity
    expose :id, documentation: { type: 'Integer' }
    expose :direction, documentation: { type: 'String', desc: 'origin | copy' }
    expose :remote_ref, documentation: { type: 'String', desc: 'chemotion://… provenance URL' }
    expose :created_at, documentation: { type: 'DateTime' }
    expose :instance, documentation: { type: 'String' }
    expose :tenant, documentation: { type: 'String' }

    def instance
      parsed&.instance
    end

    def tenant
      parsed&.tenant
    end

    private

    def parsed
      @parsed ||= ProvenanceRef.parse(object.remote_ref)
    rescue ProvenanceRef::ParseError
      nil
    end
  end
end
