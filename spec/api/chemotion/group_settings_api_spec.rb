# frozen_string_literal: true

require 'rails_helper'

# WP 07 (REQ-ELN-14): delegated group configuration surface. Every route is
# deny-by-default group-scoped: instance Admins pass, a group admin passes
# only for their OWN group (both users_admins and user_roles grants), members
# and foreign group admins get 401.
describe Chemotion::GroupSettingsAPI do
  include_context 'api request authorization context'

  let(:group_admin) { create(:person) }
  let(:member) { create(:person) }
  let(:group) { create(:group, admins: [group_admin], users: [group_admin, member]) }
  let(:other_admin) { create(:person) }
  let(:other_group) { create(:group, admins: [other_admin], users: [other_admin]) }

  let(:user) { group_admin }

  before do
    group
    other_group
  end

  describe 'authorization (all routes)' do
    routes = [
      [:get, 'profile_layout', {}],
      [:put, 'profile_layout', { layout: { sample: 1 } }],
      [:get, 'storage_quota', {}],
      [:put, 'storage_quota', { allocated_space: 0 }],
      [:post, 'broadcast', { content: 'hi' }],
      [:get, 'text_templates', {}],
      [:post, 'text_templates', { name: 'tpl' }],
    ]

    routes.each do |verb, route, payload|
      it "denies a group-A admin on group B: #{verb.to_s.upcase} #{route}" do
        public_send(verb, "/api/v1/group_settings/#{other_group.id}/#{route}", params: payload, as: :json)
        expect(response).to have_http_status(:unauthorized)
      end

      it "denies a plain member on the own group: #{verb.to_s.upcase} #{route}" do
        allow_any_instance_of(WardenAuthentication).to receive(:current_user).and_return(member)
        public_send(verb, "/api/v1/group_settings/#{group.id}/#{route}", params: payload, as: :json)
        expect(response).to have_http_status(:unauthorized)
      end
    end

    it 'returns 404 for a nonexistent group' do
      get "/api/v1/group_settings/#{Group.maximum(:id).to_i + 1}/profile_layout"
      expect(response).to have_http_status(:not_found)
    end

    it 'honors a user_roles-granted group admin (no users_admins row)' do
      granted = create(:person)
      granted.grant_role!(UserRole::GROUP_ADMIN, scope_type: UserRole::GROUP_ADMIN_SCOPE, scope_id: group.id)
      allow_any_instance_of(WardenAuthentication).to receive(:current_user).and_return(granted)

      get "/api/v1/group_settings/#{group.id}/profile_layout"
      expect(response).to have_http_status(:ok)
    end

    it 'lets an instance Admin through on any group' do
      allow_any_instance_of(WardenAuthentication).to receive(:current_user).and_return(create(:admin))
      get "/api/v1/group_settings/#{other_group.id}/profile_layout"
      expect(response).to have_http_status(:ok)
    end
  end

  describe 'default UI layout' do
    it 'stores and returns a valid layout' do
      put "/api/v1/group_settings/#{group.id}/profile_layout",
          params: { layout: { sample: 42, reaction: 1 } }, as: :json

      expect(response).to have_http_status(:ok)
      expect(group.reload.default_profile_layout).to eq('sample' => 42, 'reaction' => 1)

      get "/api/v1/group_settings/#{group.id}/profile_layout"
      expect(response.parsed_body['default_profile_layout']).to eq('sample' => 42, 'reaction' => 1)
    end

    it 'rejects unknown element keys' do
      put "/api/v1/group_settings/#{group.id}/profile_layout",
          params: { layout: { not_an_element: 1 } }, as: :json

      expect(response).to have_http_status(:unprocessable_entity)
      expect(group.reload.default_profile_layout).to be_nil
    end

    it 'rejects non-integer sorting values' do
      put "/api/v1/group_settings/#{group.id}/profile_layout",
          params: { layout: { sample: 'first' } }, as: :json

      expect(response).to have_http_status(:unprocessable_entity)
    end

    it 'clears the default with an empty hash' do
      group.update!(default_profile_layout: { 'sample' => 1 })

      put "/api/v1/group_settings/#{group.id}/profile_layout", params: { layout: {} }, as: :json

      expect(response).to have_http_status(:ok)
      expect(group.reload.default_profile_layout).to be_nil
    end
  end

  describe 'layout application in GET /api/v1/profiles' do
    # The member's factory-seeded layout is wiped so the merge chain is
    # observable: user's own value > group default > profile_default.yml.
    let(:user) { member }

    before do
      profile = member.profile
      profile.update_columns(data: profile.data.merge('layout' => {})) # rubocop:disable Rails/SkipsModelValidations
      group.update!(default_profile_layout: { 'sample' => 42 })
    end

    it 'applies the group default over the yml default' do
      get '/api/v1/profiles'

      layout = response.parsed_body.dig('data', 'layout')
      expect(layout['sample']).to eq(42)      # group default beats yml (yml: 1)
      expect(layout['reaction']).to eq(2)     # yml fills what no group defines
    end

    it 'lets the user own profile win over the group default' do
      profile = member.profile
      profile.update_columns(data: profile.data.merge('layout' => { 'sample' => 7 })) # rubocop:disable Rails/SkipsModelValidations

      get '/api/v1/profiles'

      expect(response.parsed_body.dig('data', 'layout', 'sample')).to eq(7)
    end

    it 'changes nothing when no group default is set (single-tenant behaviour)' do
      group.update!(default_profile_layout: nil)

      get '/api/v1/profiles'

      expect(response.parsed_body.dig('data', 'layout', 'sample')).to eq(1) # plain yml default
    end
  end

  # WP 09 (§9 NFR Audit): delegated group-admin changes land in audit_events.
  describe 'audit events (WP 09)' do
    it 'records group.quota_changed with the group as subject' do
      expect { put "/api/v1/group_settings/#{group.id}/storage_quota", params: { allocated_space: 1024 }, as: :json }
        .to change { AuditEvent.where(action: 'group.quota_changed').count }.by(1)

      event = AuditEvent.order(:id).last
      expect(event).to have_attributes(actor_id: group_admin.id, subject_type: 'Group', subject_id: group.id)
      expect(event.metadata['allocated_space']).to eq(1024)
    end

    it 'records group.layout_changed' do
      expect { put "/api/v1/group_settings/#{group.id}/profile_layout", params: { layout: { sample: 1 } }, as: :json }
        .to change { AuditEvent.where(action: 'group.layout_changed').count }.by(1)
    end

    it 'records no event when the change is rejected' do
      expect { put "/api/v1/group_settings/#{group.id}/storage_quota", params: { allocated_space: -1 }, as: :json }
        .not_to change(AuditEvent, :count)
    end
  end

  describe 'storage quota' do
    context 'with a finite tenant budget of 1 GB' do
      before do
        allow(ENV).to receive(:[]).and_call_original
        allow(ENV).to receive(:[]).with('TENANT_STORAGE_QUOTA_GB').and_return('1')
      end

      it 'accepts a quota that fits the budget and applies the member-floor semantics' do
        put "/api/v1/group_settings/#{group.id}/storage_quota",
            params: { allocated_space: 500_000_000 }, as: :json

        expect(response).to have_http_status(:ok)
        expect(group.reload.allocated_space).to eq(500_000_000)
        # long-standing Group#update_allocated_space semantics: members are
        # raised to at least the group's allocation
        expect(member.reload.allocated_space).to be >= 500_000_000
      end

      it 'rejects a quota that would push the group sum over the budget' do
        other_group.update!(allocated_space: 600_000_000)

        put "/api/v1/group_settings/#{group.id}/storage_quota",
            params: { allocated_space: 600_000_000 }, as: :json

        expect(response).to have_http_status(:unprocessable_entity)
        expect(response.parsed_body['error']).to include('tenant budget')
        expect(group.reload.allocated_space).not_to eq(600_000_000)
      end

      it 'rejects 0 (= unlimited) within a finite budget' do
        put "/api/v1/group_settings/#{group.id}/storage_quota",
            params: { allocated_space: 0 }, as: :json

        expect(response).to have_http_status(:unprocessable_entity)
      end
    end

    it 'accepts any quota when no tenant budget is configured (unset = unlimited)' do
      put "/api/v1/group_settings/#{group.id}/storage_quota",
          params: { allocated_space: 50 * (1024**4) }, as: :json

      expect(response).to have_http_status(:ok)
    end

    it 'rejects a negative quota' do
      put "/api/v1/group_settings/#{group.id}/storage_quota",
          params: { allocated_space: -1 }, as: :json

      expect(response).to have_http_status(:unprocessable_entity)
    end

    it 'reports quota, budget and group total' do
      group.update!(allocated_space: 123)

      get "/api/v1/group_settings/#{group.id}/storage_quota"

      body = response.parsed_body
      expect(body['allocated_space']).to eq(123)
      expect(body).to have_key('tenant_storage_quota_gb')
      expect(body['groups_allocated_total']).to eq(Group.sum(:allocated_space))
    end
  end

  describe 'broadcast' do
    let!(:channel) { create(:channel, subject: Channel::SEND_INDIVIDUAL_USERS, channel_type: 8) }

    it 'reaches exactly the group members, resolved server-side' do
      expect do
        post "/api/v1/group_settings/#{group.id}/broadcast", params: { content: 'lab meeting' }, as: :json
      end.to change(Message, :count).by(1)

      expect(response).to have_http_status(:created)
      message = Message.order(:id).last
      expect(message.channel_id).to eq(channel.id)
      expect(message.content['data']).to eq('lab meeting')
      expect(Notification.where(message_id: message.id).pluck(:user_id))
        .to match_array(group.users.ids)
    end

    it 'ignores client-supplied user_ids' do
      outsider = create(:person)

      post "/api/v1/group_settings/#{group.id}/broadcast",
           params: { content: 'x', user_ids: [outsider.id] }, as: :json

      message = Message.order(:id).last
      expect(Notification.where(message_id: message.id).pluck(:user_id))
        .to match_array(group.users.ids)
      expect(Notification.where(message_id: message.id, user_id: outsider.id)).to be_empty
    end

    it '404s when the broadcast channel is not configured' do
      channel.destroy

      post "/api/v1/group_settings/#{group.id}/broadcast", params: { content: 'x' }, as: :json

      expect(response).to have_http_status(:not_found)
    end
  end

  describe 'text templates' do
    it 'creates a template owned by the group STI user' do
      post "/api/v1/group_settings/#{group.id}/text_templates",
           params: { name: 'grp-tpl', data: { 'text' => 'hello' } }, as: :json

      expect(response).to have_http_status(:created)
      template = PersonalTextTemplate.find_by(name: 'grp-tpl')
      expect(template.user_id).to eq(group.id)
      expect(template.data).to eq('text' => 'hello')
    end

    it 'lists only the own group templates' do
      PersonalTextTemplate.create!(user_id: group.id, name: 'mine', data: {})
      PersonalTextTemplate.create!(user_id: other_group.id, name: 'theirs', data: {})

      get "/api/v1/group_settings/#{group.id}/text_templates"

      names = response.parsed_body['text_templates'].map { |t| t['name'] }
      expect(names).to eq(['mine'])
    end

    it 'updates a group template' do
      template = PersonalTextTemplate.create!(user_id: group.id, name: 'old', data: {})

      put "/api/v1/group_settings/#{group.id}/text_templates/#{template.id}",
          params: { name: 'new', data: { 'k' => 'v' } }, as: :json

      expect(response).to have_http_status(:ok)
      expect(template.reload.name).to eq('new')
      expect(template.data).to eq('k' => 'v')
    end

    it 'deletes a group template' do
      template = PersonalTextTemplate.create!(user_id: group.id, name: 'gone', data: {})

      delete "/api/v1/group_settings/#{group.id}/text_templates/#{template.id}"

      expect(response).to have_http_status(:ok)
      expect(PersonalTextTemplate.find_by(id: template.id)).to be_nil
    end

    it 'cannot touch another group template through the own group scope' do
      foreign = PersonalTextTemplate.create!(user_id: other_group.id, name: 'foreign', data: {})

      put "/api/v1/group_settings/#{group.id}/text_templates/#{foreign.id}",
          params: { name: 'hijacked' }, as: :json

      expect(response).to have_http_status(:not_found)
      expect(foreign.reload.name).to eq('foreign')
    end

    it 'enforces name uniqueness per group but not across groups' do
      PersonalTextTemplate.create!(user_id: group.id, name: 'dup', data: {})

      post "/api/v1/group_settings/#{group.id}/text_templates", params: { name: 'dup' }, as: :json
      expect(response).to have_http_status(:unprocessable_entity)

      allow_any_instance_of(WardenAuthentication).to receive(:current_user).and_return(other_admin)
      post "/api/v1/group_settings/#{other_group.id}/text_templates", params: { name: 'dup' }, as: :json
      expect(response).to have_http_status(:created)
    end
  end
end
