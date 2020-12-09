# frozen_string_literal: true

require 'rails_helper'

describe DataCite::Syncer do
  subject(:syncer) { described_class.new(device) }

  let(:device) { create(:device, device_metadata: device_metadata) }
  let(:device_metadata) { create(:device_metadata, doi: doi) }
  let(:doi) { '10.80826/device-test-2' }

  before do
    stub_request(:put, "https://api.test.datacite.org/dois/#{doi}").
      to_return(status: 200,
                body: File.read(
                  Rails.root.join('spec/fixtures/data_cite/update_doi_response.json')),
                headers: { 'Content-Type' => 'application/json' })
  end

  context 'when DOI exists at DataCite' do
    describe '#process' do
      before do
        stub_request(:get, "https://api.test.datacite.org/dois/#{doi}").
          to_return(status: 200,
                    body: File.read(
                      Rails.root.join('spec/fixtures/data_cite/get_doi_response.json')),
                    headers: { 'Content-Type' => 'application/json' })

# WebMock.allow_net_connect!

        syncer.process!
      end

      specify { expect(syncer.converter.data_cite_device.raw_response).to be_a(Hash) }

      specify do
        expect(syncer.converter.data_cite_device).to have_attributes(
          doi: doi,
          prefix: '10.80826',
          suffix: 'device-test-2',
          title: device_metadata.name,
          publisher: device_metadata.publisher,
          description: device_metadata.description,
          publication_year: device_metadata.publication_year,
          url: device.device_metadata.url,
          content_url: device.device_metadata.landing_page
        )
      end
    end
  end

  context 'when DOI does not exist on DataCite' do
    describe '#process' do
      before do
        stub_request(:get, "https://api.test.datacite.org/dois/#{doi}").
          to_return(status: 404,
                    headers: { 'Content-Type' => 'application/json' })

        stub_request(:post, 'https://api.test.datacite.org/dois/').
          to_return(status: 200,
                    body: File.read(
                      Rails.root.join('spec/fixtures/data_cite/create_doi_response.json')),
                    headers: { 'Content-Type' => 'application/json' })

        syncer.process!
      end

      specify { expect(syncer.converter.data_cite_device.raw_response).to be_a(Hash) }

      specify do
        expect(syncer.converter.data_cite_device).to have_attributes(
          doi: doi,
          prefix: '10.80826',
          suffix: 'device-test-2',
          title: device_metadata.name,
          publisher: device_metadata.publisher,
          description: device_metadata.description,
          publication_year: device_metadata.publication_year,
          url: device.device_metadata.url,
          content_url: device.device_metadata.landing_page
        )
      end
    end
  end
end


