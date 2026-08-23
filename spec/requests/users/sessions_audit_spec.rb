# frozen_string_literal: true

require 'rails_helper'

# WP 09 (§9 NFR Audit): Devise/Warden session sign-in/out events (see
# config/initializers/audit_warden.rb). The callbacks are scoped to real
# authentication, so Devise test-mode sign_in helpers emit nothing.
describe 'Devise session audit', type: :request do
  let(:user) do
    create(:person, confirmed_at: Time.zone.now, account_active: true)
  end

  describe 'POST /users/sign_in (JSON login)' do
    it 'records auth.session_in with the user as actor', :aggregate_failures do
      expect do
        post '/users/sign_in', params: { user: { login: user.name_abbreviation, password: 'testtest' } }, as: :json
      end.to change { AuditEvent.where(action: 'auth.session_in').count }.by(1)

      expect(response).to have_http_status(:ok)
      event = AuditEvent.order(:id).last
      expect(event).to have_attributes(actor_id: user.id, actor_type: 'user')
      expect(event.ip).to be_present
    end

    it 'records no session event for a failed login' do
      expect do
        post '/users/sign_in', params: { user: { login: user.name_abbreviation, password: 'wrong' } }, as: :json
      end.not_to(change { AuditEvent.where(action: 'auth.session_in').count })
    end
  end

  describe 'DELETE /users/sign_out' do
    it 'records auth.session_out' do
      post '/users/sign_in', params: { user: { login: user.name_abbreviation, password: 'testtest' } }, as: :json

      expect { delete '/users/sign_out' }
        .to change { AuditEvent.where(action: 'auth.session_out').count }.by(1)

      expect(AuditEvent.order(:id).last.actor_id).to eq(user.id)
    end
  end
end
