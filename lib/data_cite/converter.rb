# frozen_string_literal: true

module DataCite
  class Converter
    attr_reader :data_cite_device

    def self.from_data_cite(data_cite_response)
      new.tap { |i| i.from_data_cite(data_cite_response) }
    end

    def self.from_chemotion_for_create(chemotion_device)
      new.tap { |i| i.from_chemotion_for_create(chemotion_device) }
    end

    def self.from_chemotion_for_update(chemotion_device, data_cite_converter)
      new.tap do |i|
        i.from_chemotion_for_update(chemotion_device, data_cite_converter)
      end
    end

    def initialize
      @data_cite_prefix = ENV['DATA_CITE_PREFIX']
      @data_cite_device = nil
      @chemotion_device = nil
    end

    def from_data_cite(data_cite_response)
      @data_cite_device = DataCiteDevice.new(data_cite_response)
    end

    def to_data_cite
      @data_cite_device
    end

    def to_chemotion
      {
        last_data_cite_response: @date_cite_device.raw_response
      }
    end

    def from_chemotion_for_update(chemotion_device, data_cite_converter)

    end

    def from_chemotion_for_create(chemotion_device)
      @chemotion_device = chemotion_device
      @data_cite_device = {
        data: {
          type: 'dois',
          attributes: {
            prefix: @data_cite_prefix,
            titles: [
              {
                title: @chemotion_device.device_metadata.name
              }
            ]
          }
        }
      }
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
