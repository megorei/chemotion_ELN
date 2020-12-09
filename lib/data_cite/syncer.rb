# frozen_string_literal: true

module DataCite
  class Syncer
    # attr_reader :date_cite_device

    def initialize(chemotion_device)
      @chemotion_device = chemotion_device
      @metadata = @chemotion_device.device_metadata
      @date_cite_device = nil
      @client = Client.new
    end

    def process!
      if (data_cite_converter = fetch_from_data_cite)
        update_at_data_cite!(data_cite_converter)
        # update_at_chemotion! ??
      else
        data_cite_converter = create_at_data_cite!
        chemotion_converter = update_at_chemotion!(data_cite_converter)
        update_at_data_cite!(data_cite_converter)
      end
    end

    private

    def fetch_from_data_cite
      return false if @metadata.doi.blank?

      data_cite_response = @client.get(@metadata.doi)
      Converter.from_data_cite(data_cite_response)
    end

    def create_at_data_cite!
      converter = Converter.from_chemotion_for_create(@chemotion_device)
      data_cite_response = @client.create(converter.to_data_cite)
      Converter.from_data_cite(data_cite_response)
    end

    def update_at_data_cite!(data_cite_converter)
      chemotion_converter =
        Converter.from_chemotion_for_update(@chemotion_device, data_cite_converter)
      @client.update(chemotion_converter.to_data_cite)
    end

    def update_at_chemotion!(data_cite_converter)
      @metadata.update_attributes!(data_cite_converter.to_chemotion)
      Converter.from_chemotion_for_update(@chemotion_device, data_cite_converter)
    end
  end
end
