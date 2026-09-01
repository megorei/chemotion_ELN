# frozen_string_literal: true

require 'rails_helper'

describe Chemotion::ServiceStatusAPI do
  include_context 'api request authorization context'

  context 'as instance admin' do
    let(:user) { create(:admin) }

    it 'serves one uniform status row per shared service' do
      get '/api/v1/admin/service_status'
      expect(response).to have_http_status :ok
      services = parsed_json_response['services']
      expect(services.map { |s| s['service'] }).to contain_exactly('converter', 'spectra', 'indigo', 'ketcher')
      expect(services).to all(include('configured', 'ok'))
    end
  end

  context 'as regular user' do
    let(:user) { create(:person) }

    it 'refuses access' do
      get '/api/v1/admin/service_status'
      expect(response).to have_http_status :unauthorized
    end
  end
end
