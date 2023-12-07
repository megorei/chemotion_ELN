# frozen_string_literal: true

require 'rails_helper'

RSpec.describe DeviceDetail do
  let(:device) { create(:device) }
  let(:device_detail) { create(:device_detail) }

  before do
    device.device_detail = device_detail
    device.save
  end

  it 'handles device_detail relationship correctly' do
    expect(device.device_detail).to eq described_class.find(device_detail.id)
  end
end
