# frozen_string_literal: true

require 'rails_helper'

describe Chemotion::AuthenticationAPI do
  describe 'POST /api/v1/authentication/token' do
    subject(:execute_request) { post('/api/v1/authentication/token', params: params) }

    let(:build_user) { create(:person) }
    let(:params) do
      {
        username: build_user.name_abbreviation,
        password: 'testtest',
      }
    end

    context 'when use case returns a token' do
      before do
        allow(JsonWebToken).to receive(:encode).and_return('my-token')
        execute_request
      end

      it 'responds 201' do
        expect(response).to have_http_status :created
      end

      it 'responds a hash with a token' do
        expect(parsed_json_response).to eq({ 'token' => 'my-token' })
      end
    end

    context 'when use case returns nil' do
      before do
        allow(Usecases::Authentication::BuildToken).to receive(:execute!).and_return(nil)
        execute_request
      end

      it 'responds an error' do
        expect(response).to have_http_status :unauthorized
      end
    end

    # WP 09 (§9 NFR Audit)
    describe 'audit events' do
      it 'records auth.login with the user as actor on success', :aggregate_failures do
        expect { execute_request }.to change { AuditEvent.where(action: 'auth.login').count }.by(1)

        event = AuditEvent.order(:id).last
        expect(event.actor_id).to eq(build_user.id)
        expect(event.actor_type).to eq('user')
        expect(event.metadata['username']).to eq(build_user.name_abbreviation)
        expect(event.ip).to be_present
      end

      it 'records auth.login_failed with the tried username on failure', :aggregate_failures do
        params[:password] = 'wrong-password'

        expect { execute_request }.to change { AuditEvent.where(action: 'auth.login_failed').count }.by(1)

        event = AuditEvent.order(:id).last
        expect(event.actor_id).to be_nil
        expect(event.metadata['username']).to eq(build_user.name_abbreviation)
        expect(response).to have_http_status :unauthorized
      end
    end
  end
end
