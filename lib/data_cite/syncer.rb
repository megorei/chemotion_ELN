# frozen_string_literal: true

module DataCite
  class Syncer
    attr_reader :converter

    def initialize(chemotion_device)
      @chemotion_device = chemotion_device
      @chemotion_metadata = @chemotion_device.device_metadata
      @date_cite_device = nil
      @client = Client.new
      @converter = Converter.new(@chemotion_metadata)
    end

    def process!
      return false if @chemotion_metadata.doi.blank?

      if fetch_from_data_cite
        update_at_data_cite!
        # update_at_chemotion! ??
      else
        create_at_data_cite!
        update_at_chemotion!
        update_at_data_cite!
      end
    end

    private

    def fetch_from_data_cite
      data_cite_response = @client.get(@chemotion_metadata.doi)
      @converter.init_data_cite_device_from_response(data_cite_response)
    rescue Client::NotFoundError
      false
    end

    def create_at_data_cite!
      data_cite_response = @client.create(@converter.to_data_cite_for_create)
      @converter.init_data_cite_device_from_response(data_cite_response)
    end

    def update_at_data_cite!
      data_cite_response =
        @client.update(@chemotion_metadata.doi, @converter.to_data_cite_for_update)
      @converter.init_data_cite_device_from_response(data_cite_response)
    end

    def update_at_chemotion!
      @chemotion_metadata.update_attributes!(@converter.to_chemotion)
    end
  end
end
