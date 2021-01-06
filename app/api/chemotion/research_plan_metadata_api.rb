module Chemotion
  class ResearchPlanMetadataAPI < Grape::API
    include Grape::Kaminari
    helpers ParamsHelpers
    helpers CollectionHelpers
    helpers ContainerHelpers

    namespace :research_plan_metadata do
      desc 'Get researchPlanMetadata by researchPlan id'
      params do
        requires :research_plan_id, type: Integer, desc: 'research plan id'
        end
        route_param :research_plan_id do
        get do
          present ResearchPlanMetadata.find_by(research_plan_id: params[:research_plan_id]), with: Entities::ResearchPlanMetadataEntity, root: 'research_plan_metadata'
        end
      end

      desc 'create/update research plan metadata'
      params do
        requires :research_plan_id, type: Integer, desc: 'research plan id'

        optional :name, type: String, desc: 'research plan name'
        optional :doi, type: String, desc: 'research plan doi'
        optional :url, type: String, desc: 'research plan url'
        optional :landing_page, type: String, desc: 'research plan landing_page'
        optional :type, type: String, desc: 'research plan type'
        optional :description, type: String, desc: 'research plan description'
        optional :publisher, type: String, desc: 'research plan publisher'
        optional :publication_year, type: Integer, desc: 'research plan publication year'
        optional :data_cite_state, type: String, desc: 'state'

        optional :dates, desc: 'research plan dates'
      end
      post do
        attributes = declared(params, include_missing: false)
        metadata = ResearchPlanMetadata.find_or_initialize_by(research_plan_id: attributes[:research_plan_id])
        new_record = metadata.new_record?
        metadata.update_attributes!(attributes)
        # DataCite.find_and_create_at_chemotion!(metadata.research_plan) if new_record
        present metadata.reload, with: Entities::ResearchPlanMetadataEntity, root: 'research_plan_metadata'
      rescue ActiveRecord::RecordInvalid => e
        { error: e.message }
      end
    end
  end
end
