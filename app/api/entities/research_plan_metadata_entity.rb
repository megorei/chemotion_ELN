module Entities
  class ResearchPlanMetadataEntity < Grape::Entity
    expose :id, documentation: { type: 'Integer', desc: 'metadata id'}
    expose :research_plan_id, documentation: { type: 'String', desc: 'metadata id'}
    expose :name, documentation: { type: 'String', desc: 'research plan name' }
    expose :doi, documentation: { type: 'String', desc: 'research plan doi' }
    expose :url, documentation: { type: 'String', desc: 'research plan url' }
    expose :landing_page, documentation: { type: 'String', desc: 'research plan landing_page' }
    expose :type, documentation: { type: 'String', desc: 'research plan type' }
    expose :description, documentation: { type: 'String', desc: 'research plan description' }
    expose :publisher, documentation: { type: 'String', desc: 'research plan publisher' }
    expose :publication_year, documentation: { type: 'Integer', desc: 'research plan publication year' }

    expose :dates, documentation: { desc: 'research plan dates' }

    # expose :data_cite_prefix, documentation: { type: 'String', desc: 'DataCite prefix' }
    # expose :data_cite_state, documentation: { type: 'String', desc: 'DataCite state' }
    # expose :data_cite_created_at, documentation: { type: 'DateTime', desc: 'created_at DataCite ' }
    # expose :data_cite_updated_at, documentation: { type: 'DateTime', desc: 'updated_at DataCite' }
    # expose :data_cite_version, documentation: { type: 'Integer', desc: 'version at DataCite' }
  end
end
