# frozen_string_literal: true

require 'rails_helper'

# Regression guard: the admin_* surfaces gate exclusively on
# `current_user.is_a?(Admin)` (instance Admin, STI). A GROUP admin is a plain
# Person and must never reach any of them — one representative route per file:
# admin_api, admin_user_api, admin_device_api, admin_device_metadata_api,
# admin_info_support_api, report_template_api, third_party_app_api.
describe 'admin API surfaces against group admins' do # rubocop:disable RSpec/DescribeClass -- spans seven API classes
  include_context 'api request authorization context'

  let(:user) { create(:person) }

  before do
    create(:group, admins: [user], users: [user])
  end

  [
    [:get, '/api/v1/admin/disk', 'AdminAPI'],
    [:get, '/api/v1/admin/users', 'AdminUserAPI'],
    [:get, '/api/v1/admin_devices', 'AdminDeviceAPI'],
    [:get, '/api/v1/admin_device_metadata/1', 'AdminDeviceMetadataAPI'],
    [:get, '/api/v1/admin/info_support_links', 'AdminInfoSupportAPI'],
    [:get, '/api/v1/report_templates/1', 'ReportTemplateAPI (gated section)'],
    [:post, '/api/v1/third_party_apps/admin', 'ThirdPartyAppAPI (admin namespace)'],
  ].each do |verb, path, surface|
    it "denies a group admin on #{surface}: #{verb.to_s.upcase} #{path}" do
      public_send(verb, path)
      expect(response).to have_http_status(:unauthorized)
    end
  end

  it 'still serves the deliberately public report template list' do
    get '/api/v1/report_templates'
    expect(response).to have_http_status(:ok)
  end
end
