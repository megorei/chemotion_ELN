# frozen_string_literal: true

require 'rails_helper'

describe Chemotion::AdminAPI do
    let!(:admin)  { create(:admin, first_name: 'Jane', last_name: 'Doe') }

    before do
      allow_any_instance_of(WardenAuthentication).to receive(:current_user)
        .and_return(admin)
    end

  describe 'GET /api/v1/admin/device/' do
    let(:device) { create(:device, device_metadata: create(:device_metadata)) }
    before do
      device
      get "/api/v1/admin/device/#{device.id}"
    end

    it 'returns a device with metadata' do
      device_attributes = JSON.parse(response.body)['device']

      expect(device_attributes['id']).to eql(device.id)
      expect(device_attributes['device_metadata']['device_id']).to eql(device.id)
    end
  end

  describe 'GET /api/v1/admin/deviceMetadata/' do
    let(:device) { create(:device, device_metadata: create(:device_metadata)) }
    before do
      device
      get "/api/v1/admin/deviceMetadata/#{device.id}"
    end

    it 'returns deviceMetadata' do
      device_metadata_attributes = JSON.parse(response.body)['device_metadata']

      expect(device_metadata_attributes['device_id']).to eql(device.id)
    end
  end

  describe 'POST /api/v1/admin/deviceMetadata' do
    let(:device) { create(:device) }

    let(:params) do
      {
        device_id: device.id,
        doi: '10.12345/DEVICE-123',
        name: 'Metadata',
        type: 'Test-Type',
        description: 'Metadata for device',
        publisher: 'Chemotion',
        publication_year: Time.current.year,
        owners: [
          {
            ownerName: Faker::Company.name,
            ownerContact: Faker::Internet.email,
            ownerIdentifier: { id: 'test-id' }
          }
        ]
      }
    end

    describe 'when updating device metadata' do
      before do
        device
        post '/api/v1/admin/deviceMetadata', params
      end

      it 'Creates device metadata' do
        expect(DeviceMetadata.where(doi: '10.12345/DEVICE-123')).not_to be_empty
        expect(DeviceMetadata.find_by(doi: '10.12345/DEVICE-123').device).to eq device
        expect(DeviceMetadata.find_by(doi: '10.12345/DEVICE-123')).to have_attributes(params.deep_stringify_keys)
      end
    end

    describe 'when updating device metadata' do
      let(:update_params) do
        {
          device_id: device.id,
          owners: [{
            owner: {
              ownerName: Faker::Company.name,
              ownerContact: Faker::Internet.email,
              ownerIdentifier: { id: 'test-id-2' }
            }
          }]
        }
      end

      before do
        device
        post '/api/v1/admin/deviceMetadata', params
        post '/api/v1/admin/deviceMetadata', update_params
      end

      it 'Updates device metadata' do
        expect(DeviceMetadata.count).to eq(1)
        expect(DeviceMetadata.where(doi: '10.12345/DEVICE-123')).not_to be_empty
        expect(DeviceMetadata.find_by(doi: '10.12345/DEVICE-123').device).to eq device
        expect(DeviceMetadata.find_by(doi: '10.12345/DEVICE-123')).to have_attributes(
          params.update(update_params).deep_stringify_keys
        )
      end
    end
  end
end
