# frozen_string_literal: true

require 'rails_helper'

# REQ-ELN-19 (P1 WP 04): the UI needs (a) guest fields on the current-user
# payload and (b) a public instance-identity endpoint for context labelling.
describe 'guest UI context payloads' do
  describe 'GET /api/v1/users/current' do
    include_context 'api request authorization context'

    before { get '/api/v1/users/current' }

    context 'with a guest (external) user' do
      let(:user) do
        create(:person, external: true, federated_id: 'idp.example#guest',
                        home_tenant_hint: 'idp.example')
      end

      it 'exposes the guest flag' do
        expect(parsed_json_response.dig('user', 'external')).to be true
      end

      it 'exposes the home tenant hint' do
        expect(parsed_json_response.dig('user', 'home_tenant_hint')).to eq('idp.example')
      end
    end

    context 'with a regular local user' do
      let(:user) { create(:person) }

      it 'exposes external as false' do
        expect(parsed_json_response.dig('user', 'external')).to be false
      end

      it 'exposes no home tenant hint' do
        expect(parsed_json_response.dig('user', 'home_tenant_hint')).to be_nil
      end
    end
  end

  describe 'GET /api/v1/public/instance' do
    before { get '/api/v1/public/instance' }

    it 'responds 200 without authentication' do
      expect(response).to have_http_status :ok
    end

    it 'serves the tenant identity block' do
      instance = parsed_json_response['instance']
      expect(instance).to include(
        'id' => TenantContext.current.id,
        'name' => TenantContext.current.name,
        'application_title' => TenantContext.current.application_title,
      )
    end

    it 'serves the guest permission ceiling for the invitation UI' do
      expect(parsed_json_response.dig('instance', 'guest_max_permission_level'))
        .to eq(TenantContext.current.guest_max_permission_level)
    end
  end
end
