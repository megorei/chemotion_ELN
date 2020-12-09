# frozen_string_literal: true

module DataCite
  class Client
    include HTTParty
    base_uri 'https://api.test.datacite.org'
    format :json

    def initialize; end

    def get(doi)
      self.class.get("/dois/#{doi}").parsed_response
    end

    def create(payload)
      self.class.post('/dois/', options.merge(body: payload.to_json)).parsed_response
    end

    def update(doi, payload)
      self.class.put("/dois/#{doi}", options.merge(body: payload.to_json)).parsed_response
    end

    def username
      'TIB.MGKHGJ'
    end

    def password
      'GbeBp9z6hpMs2fd'
    end

    def options
      {
        basic_auth: {
          username: username,
          password: password
        },
        headers: {
          'Content-Type': 'application/vnd.api+json'
        }
      }
    end

  end
end


# $ curl -X POST -H "Content-Type: application/vnd.api+json" --user YOUR_REPOSITORY_ID:YOUR_PASSWORD -d @my_draft_doi.json https://api.test.datacite.org/dois
