# frozen_string_literal: true

module DataCite
  class DataCiteDevice
    attr_reader :raw_response

    def initialize(raw_response)
      @raw_response = raw_response
    end

    def data
      @raw_response&.fetch('data', nil)
    end

    def doi
      data&.fetch('id', nil)
    end

    def attributes
      data&.fetch('attributes', nil)
    end

    def doi
      data&.fetch('id', nil)
    end

    def prefix
      attributes&.fetch('prefix', nil)
    end

    def suffix
      attributes&.fetch('suffix', nil)
    end

    def title
      attributes&.fetch('titles', []).first&.fetch('title', nil)
    end
  end
end
