# frozen_string_literal: true

require 'rails_helper'

# P1 WP 06 (REQ-ELN-20c): per-group restriction of the guest escalation cap.
describe 'group guest permission setting' do
  include_context 'api request authorization context'

  let(:group) { create(:group) }
  let(:user) { create(:person) } # promoted to group admin below

  before { group.admins << user }

  describe 'GET /api/v1/group_settings/:id/guest_permission' do
    it 'serves the group cap and tenant policy context' do
      group.update!(guest_max_permission_level: 1)
      get "/api/v1/group_settings/#{group.id}/guest_permission"
      expect(response).to have_http_status :ok
      expect(parsed_json_response).to include(
        'guest_max_permission_level' => 1,
        'tenant_escalation_enabled' => false,
      )
    end
  end

  describe 'PUT /api/v1/group_settings/:id/guest_permission' do
    it 'stores a restriction and audits it' do
      expect do
        put "/api/v1/group_settings/#{group.id}/guest_permission",
            params: { guest_max_permission_level: 1 }
      end.to change { AuditEvent.where(action: 'group.guest_cap_changed').count }.by(1)
      expect(response).to have_http_status :ok
      expect(group.reload.guest_max_permission_level).to eq(1)
    end

    it 'clears the restriction with an omitted value' do
      group.update!(guest_max_permission_level: 1)
      put "/api/v1/group_settings/#{group.id}/guest_permission", params: {}
      expect(response).to have_http_status :ok
      expect(group.reload.guest_max_permission_level).to be_nil
    end

    it 'rejects values above the hard ceiling' do
      put "/api/v1/group_settings/#{group.id}/guest_permission",
          params: { guest_max_permission_level: 4 }
      expect(response).to have_http_status :bad_request
    end

    it 'refuses a non-admin member' do
      member = create(:person)
      group.users << member
      allow_any_instance_of(WardenAuthentication).to receive(:current_user).and_return(member)
      put "/api/v1/group_settings/#{group.id}/guest_permission",
          params: { guest_max_permission_level: 1 }
      expect(response).to have_http_status :unauthorized
    end
  end
end
