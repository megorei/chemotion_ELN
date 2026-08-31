# frozen_string_literal: true

require 'rails_helper'

# P1 WP 05 (REQ-ELN-20) / P0 WP 09 stage 1: admin audit-events API.
describe Chemotion::AuditEventsAPI do
  include_context 'api request authorization context'

  let(:guest) { create(:person, external: true, federated_id: 'idp.example#g') }
  let(:local) { create(:person) }

  before do
    AuditEvent.record(action: 'guest.login', actor: guest, meta: { federated_id: guest.federated_id })
    AuditEvent.record(action: 'guest.login_denied', actor: :guest, meta: { federated_id: 'x#y' })
    AuditEvent.record(action: 'auth.login', actor: local)
    AuditEvent.record(action: 'config.changed', actor: :system)
  end

  context 'as instance admin' do
    let(:user) { create(:admin) }

    it 'lists events newest first' do
      get '/api/v1/admin/audit_events'
      expect(response).to have_http_status :ok
      actions = parsed_json_response['audit_events'].map { |e| e['action'] }
      expect(actions.first).to eq('config.changed')
      expect(actions).to include('guest.login', 'auth.login')
    end

    it "actor_type=guest returns guest-stamped rows AND external-user rows, nothing else" do
      get '/api/v1/admin/audit_events', params: { actor_type: 'guest' }
      actions = parsed_json_response['audit_events'].map { |e| e['action'] }
      expect(actions).to contain_exactly('guest.login', 'guest.login_denied')
    end

    it 'filters by action' do
      get '/api/v1/admin/audit_events', params: { event_action: 'auth.login' }
      expect(parsed_json_response['audit_events'].map { |e| e['action'] }).to eq(['auth.login'])
    end

    it 'marks guest actors in the resolved name' do
      get '/api/v1/admin/audit_events', params: { actor_type: 'guest' }
      names = parsed_json_response['audit_events'].map { |e| e['actor_name'] }
      expect(names).to include("#{guest.name} (guest)")
    end

    it 'serves the distinct action list' do
      get '/api/v1/admin/audit_events/actions'
      expect(parsed_json_response['actions']).to include('auth.login', 'guest.login')
    end
  end

  context 'as regular user' do
    let(:user) { local }

    it 'refuses access' do
      get '/api/v1/admin/audit_events'
      expect(response).to have_http_status :unauthorized
    end
  end
end
