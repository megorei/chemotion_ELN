# frozen_string_literal: true

module DataCite
  class Converter
    attr_reader :data_cite_device

    def initialize(chemotion_metadata)
      @data_cite_prefix = ENV['DATA_CITE_PREFIX']
      @chemotion_metadata = chemotion_metadata
      @doi = @chemotion_metadata.doi

      @data_cite_device = nil
    end

    def to_data_cite_for_create
      {
        data: {
          type: 'dois',
          attributes: {
            doi: @doi,
            titles: [
              {
                title: @chemotion_metadata.name
              }
            ]
          }
        }
      }
    end

    def init_data_cite_device_from_response(data_cite_response)
      @data_cite_device = DataCiteDevice.new(data_cite_response)
    end

    def to_chemotion
      {
        data_cite_last_response: @data_cite_device.raw_response,
        data_cite_created_at: @data_cite_device.created,
        data_cite_updated_at: @data_cite_device.updated,
        data_cite_version: @data_cite_device.metadata_version
      }
    end

    def to_data_cite_for_update
      {
        data: {
          type: 'dois',
          attributes: {
            titles: [
              {
                title: format { @chemotion_metadata.name }
              }
            ],
            publisher: format { @chemotion_metadata.publisher },
            descriptions: [
              { description: format { @chemotion_metadata.description } }
            ],
            publicationYear: format { @chemotion_metadata.publication_year },
            url: format { @chemotion_metadata.url },
            landingPage: format { @chemotion_metadata.landing_page },
            dates: (@chemotion_metadata.dates || [])
          }
        }
      }
    end

    def format
      yield.presence
      # .try(&:strip)
    end
  end
end



    # t.integer  "device_id"
    # t.string   "doi"
    # t.string   "url"
    # t.string   "landing_page"
    # t.string   "name"
    # t.string   "type"
    # t.string   "description"
    # t.string   "publisher"
    # t.integer  "publication_year"
    # t.jsonb    "manufacturers"
    # t.jsonb    "owners"
    # t.jsonb    "dates"
    # t.datetime "created_at",       null: false
    # t.datetime "updated_at",       null: false
    # t.datetime "deleted_at"
