# frozen_string_literal: true

require 'rails_helper'

describe DataCite::Syncer do
  subject(:syncer) { described_class.new(device) }

  let(:device) { create(:device, device_metadata: create(:device_metadata, doi: doi)) }
  let(:doi) { '10.5438/0012' }

  before do
    stub_request(:get, 'https://api.test.datacite.org/dois/10.5438/0012').
      to_return(status: 200,
                body: File.read(
                  Rails.root.join('spec/fixtures/data_cite/get_doi_response.json')),
                headers: { 'Content-Type' => 'application/json' })
  end

  context 'with existing doi' do
    describe '#process' do
      before do
        syncer.process!
      end

      specify { expect(syncer.converter.data_cite_device.raw_response).to be_a(Hash) }
      specify { expect(syncer.converter.data_cite_device.doi).to eql(doi) }
    end
  end

  context 'without existing doi' do
    let(:doi) { nil }

    describe '#process' do
      before do
       stub_request(:post, 'https://api.test.datacite.org/dois/').
          to_return(status: 200,
                    body: File.read(
                      Rails.root.join('spec/fixtures/data_cite/create_doi_response.json')),
                    headers: { 'Content-Type' => 'application/json' })
        # WebMock.allow_net_connect!
        syncer.process!
      end

      # specify { byebug }
      specify { expect(syncer.converter.data_cite_device.raw_response).to be_a(Hash) }
      specify { expect(syncer.converter.data_cite_device.doi).to eql('10.80826/cqek-y374') }
      specify { expect(syncer.converter.data_cite_device.prefix).to eql('10.80826') }
      specify { expect(syncer.converter.data_cite_device.suffix).to eql('cqek-y374') }
      specify { expect(syncer.converter.data_cite_device.title).to eql(device.device_metadata.name) }
    end
  end
end


