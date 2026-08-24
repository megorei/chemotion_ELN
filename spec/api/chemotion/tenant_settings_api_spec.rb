# frozen_string_literal: true

RSpec.describe Chemotion::TenantSettingsAPI do
  let!(:admin) { create(:admin) }
  let(:person) { create(:person) }

  describe 'authorization' do
    before do
      allow_any_instance_of(WardenAuthentication).to receive(:current_user).and_return(person) # rubocop:disable RSpec/AnyInstance
    end

    it 'rejects non-admins with 401 on GET and PUT', :aggregate_failures do
      get '/api/v1/admin/tenant_settings'
      expect(response).to have_http_status(:unauthorized)

      put '/api/v1/admin/tenant_settings',
          params: { section: 'ui_components', key: 'weighing_tasks', value: true }, as: :json
      expect(response).to have_http_status(:unauthorized)
    end
  end

  context 'when signed in as admin' do
    before do
      allow_any_instance_of(WardenAuthentication).to receive(:current_user).and_return(admin) # rubocop:disable RSpec/AnyInstance
    end

    describe 'GET /api/v1/admin/tenant_settings' do
      it 'returns effective config with provenance for every whitelisted section', :aggregate_failures do
        TenantSetting.write(section: 'converter', key: 'timeout', value: 60)

        get '/api/v1/admin/tenant_settings'

        expect(response).to have_http_status(:ok)
        expect(parsed_json_response['sections'].keys).to match_array(TenantSetting::SECTIONS)
        entry = parsed_json_response['sections']['converter']['timeout']
        expect(entry).to include('value' => 60, 'source' => 'db', 'read_only' => false,
                                 'secret' => false, 'restart_required' => false)
        expect(parsed_json_response['restart_required']).to include('smtp' => 'all')
        expect(parsed_json_response['restart_required']['signup']).to include('disabled')
      end

      it 'limits to one section and marks Absolute ENV keys read-only', :aggregate_failures do
        ENV['CONVERTER_PROFILE'] = 'ops'

        get '/api/v1/admin/tenant_settings', params: { section: 'converter' }

        expect(parsed_json_response['sections'].keys).to eq(['converter'])
        expect(parsed_json_response['sections']['converter']['profile'])
          .to include('value' => 'ops', 'source' => 'env-absolute', 'read_only' => true)
      ensure
        ENV.delete('CONVERTER_PROFILE')
      end

      it 'masks secret values' do
        TenantSetting.write(section: 'radar', key: 'client_secret', value: 'oauth-secret')

        get '/api/v1/admin/tenant_settings', params: { section: 'radar' }

        expect(parsed_json_response['sections']['radar']['client_secret'])
          .to include('value' => TenantSetting::SECRET_PLACEHOLDER, 'secret' => true)
        expect(response.body).not_to include('oauth-secret')
      end
    end

    describe 'PUT /api/v1/admin/tenant_settings' do
      it 'persists the setting and audits config.changed', :aggregate_failures do
        expect do
          put '/api/v1/admin/tenant_settings',
              params: { section: 'ui_components', key: 'weighing_tasks', value: true }, as: :json
        end.to change(AuditEvent.where(action: 'config.changed'), :count).by(1)

        expect(response).to have_http_status(:ok)
        expect(parsed_json_response).to include('section' => 'ui_components', 'key' => 'weighing_tasks',
                                                'secret' => false, 'restart_required' => false)
        expect(TenantSetting.find_by(section: 'ui_components', key: 'weighing_tasks').value).to be(true)
        event = AuditEvent.where(action: 'config.changed').last
        expect(event.metadata).to include('section' => 'ui_components', 'key' => 'weighing_tasks')
        expect(event.actor_id).to eq(admin.id)
      end

      it 'additionally audits config.restart_requested for boot-wired keys (REQ-ELN-9)', :aggregate_failures do
        expect do
          put '/api/v1/admin/tenant_settings',
              params: { section: 'smtp', key: 'address', value: 'relay.example' }, as: :json
        end.to change(AuditEvent.where(action: 'config.restart_requested'), :count).by(1)

        expect(parsed_json_response['restart_required']).to be(true)
        expect(AuditEvent.where(action: 'config.restart_requested').last.metadata)
          .to include('section' => 'smtp', 'key' => 'address')
      end

      it 'routes secret keys to the encrypted store and never echoes the value', :aggregate_failures do
        put '/api/v1/admin/tenant_settings',
            params: { section: 'smtp', key: 'password', value: 'hunter2' }, as: :json

        expect(response).to have_http_status(:ok)
        expect(parsed_json_response['secret']).to be(true)
        expect(response.body).not_to include('hunter2')
        expect(TenantSetting.where(section: 'smtp', key: 'password')).to be_empty
        expect(TenantSettingSecret.find_by(section: 'smtp', key: 'password').secret).to eq('hunter2')
        expect(AuditEvent.where(action: 'config.changed').last.metadata['secret']).to be(true)
      end

      it 'rejects sections outside the whitelist with 422' do
        put '/api/v1/admin/tenant_settings',
            params: { section: 'devise', key: 'stretches', value: 12 }, as: :json

        expect(response).to have_http_status(:unprocessable_entity)
        expect(TenantSetting.count).to eq(0)
      end

      it 'removes an override when value is null' do
        TenantSetting.write(section: 'ui_components', key: 'weighing_tasks', value: true)

        put '/api/v1/admin/tenant_settings',
            params: { section: 'ui_components', key: 'weighing_tasks', value: nil }, as: :json

        expect(response).to have_http_status(:ok)
        expect(TenantSetting.where(section: 'ui_components', key: 'weighing_tasks')).to be_empty
      end
    end
  end
end
