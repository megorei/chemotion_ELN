# frozen_string_literal: true

require 'rails_helper'

# Regression guard: the legacy DeviceAPI trusted client-supplied device ids —
# any authenticated user could read, update or delete any device. Mutations are
# now gated: instance Admin, a user directly linked to the device, or a group
# admin of a linked group. Reads additionally allow members of a linked group
# (mirroring the exposure of GET /api/v1/users/devices).
describe Chemotion::DeviceAPI do
  include_context 'api request authorization context'

  let(:owner) { create(:person) }
  let(:stranger) { create(:person) }
  let(:group_admin_a) { create(:person) }
  let(:member_a) { create(:person) }
  let(:group_admin_b) { create(:person) }
  let(:group_a) { create(:group, admins: [group_admin_a], users: [group_admin_a, member_a]) }
  let(:admin_user) { create(:admin) }
  let(:device) do
    create(:device).tap do |dev|
      dev.users << owner
      dev.users << group_a
    end
  end

  before { create(:group, admins: [group_admin_b], users: [group_admin_b]) }

  describe 'PUT /api/v1/devices/:id' do
    subject(:execute_request) do
      put "/api/v1/devices/#{device.id}", params: { title: 'Renamed', samples: [] }, as: :json
    end

    # The PUT body still references the dropped devices_samples table and the
    # title/code/types params that no longer map to Device columns — it is
    # legacy-dead for EVERY caller (unchanged here). Only the gate is
    # asserted here: an authorized caller reaches the legacy body (which
    # raises on the dropped association) instead of being rejected with 401.
    shared_examples 'passes the gate into the legacy-dead body' do
      it 'is not rejected by the authorization gate' do
        expect { execute_request }.to raise_error(NoMethodError, /devices_samples/)
      end
    end

    context 'when called by a directly linked user' do
      let(:user) { owner }

      it_behaves_like 'passes the gate into the legacy-dead body'
    end

    context 'when called by an admin of a linked group' do
      let(:user) { group_admin_a }

      it_behaves_like 'passes the gate into the legacy-dead body'
    end

    context 'when called by an instance Admin' do
      let(:user) { admin_user }

      it_behaves_like 'passes the gate into the legacy-dead body'
    end

    context 'when called by an unrelated user' do
      let(:user) { stranger }

      it 'is unauthorized and does not update' do
        execute_request
        expect(response).to have_http_status(:unauthorized)
        expect(device.reload.name).not_to eq('Renamed')
      end
    end

    context 'when called by the admin of an unrelated group' do
      let(:user) { group_admin_b }

      it 'is unauthorized' do
        execute_request
        expect(response).to have_http_status(:unauthorized)
        expect(device.reload.name).not_to eq('Renamed')
      end
    end

    context 'when called by a plain member of a linked group' do
      let(:user) { member_a }

      it 'is unauthorized (members read, group admins manage)' do
        execute_request
        expect(response).to have_http_status(:unauthorized)
      end
    end
  end

  describe 'DELETE /api/v1/devices/:id' do
    subject(:execute_request) { delete "/api/v1/devices/#{device.id}" }

    context 'when called by a directly linked user' do
      let(:user) { owner }

      it 'deletes the device' do
        execute_request
        expect(response).to have_http_status(:ok)
        expect(Device.exists?(device.id)).to be false
      end
    end

    context 'when called by the admin of an unrelated group' do
      let(:user) { group_admin_b }

      it 'is unauthorized and keeps the device' do
        execute_request
        expect(response).to have_http_status(:unauthorized)
        expect(Device.exists?(device.id)).to be true
      end
    end

    context 'when called by an unrelated user' do
      let(:user) { stranger }

      it 'is unauthorized' do
        execute_request
        expect(response).to have_http_status(:unauthorized)
        expect(Device.exists?(device.id)).to be true
      end
    end
  end

  describe 'POST /api/v1/devices/:id/selected' do
    context 'when called by an unrelated user' do
      let(:user) { stranger }

      it 'is unauthorized' do
        post "/api/v1/devices/#{device.id}/selected"
        expect(response).to have_http_status(:unauthorized)
      end
    end
  end

  describe 'GET /api/v1/devices/:id' do
    subject(:execute_request) { get "/api/v1/devices/#{device.id}" }

    context 'when called by a member of a linked group' do
      let(:user) { member_a }

      it 'returns the device' do
        execute_request
        expect(response).to have_http_status(:ok)
        expect(parsed_json_response['device']['id']).to eq(device.id)
      end
    end

    context 'when called by an unrelated user' do
      let(:user) { stranger }

      it 'is unauthorized' do
        execute_request
        expect(response).to have_http_status(:unauthorized)
      end
    end
  end

  describe 'GET /api/v1/devices' do
    before { device }

    context 'when called by a directly linked user' do
      let(:user) { owner }

      it 'lists the own device' do
        get '/api/v1/devices'
        expect(response).to have_http_status(:ok)
        expect(parsed_json_response['devices'].pluck('id')).to include(device.id)
      end
    end

    context 'when called by an unrelated user' do
      let(:user) { stranger }

      it 'does not list the device' do
        get '/api/v1/devices'
        expect(response).to have_http_status(:ok)
        expect(parsed_json_response['devices'].pluck('id')).not_to include(device.id)
      end
    end

    context 'when called by an instance Admin' do
      let(:user) { admin_user }

      it 'lists all devices' do
        get '/api/v1/devices'
        expect(parsed_json_response['devices'].pluck('id')).to include(device.id)
      end
    end
  end
end
