# frozen_string_literal: true

require 'rails_helper'

describe Chemotion::EditorAPI do
  include_context 'api request authorization context'

  describe 'GET /api/v1/editor/initial' do
    context 'when no document server is configured (REQ-ELN-28)' do
      before do
        allow(Rails.configuration).to receive(:editors).and_return(nil)
        get '/api/v1/editor/initial'
      end

      it 'reports the editor as not installed instead of failing' do
        expect(response).to have_http_status(:ok)
        expect(JSON.parse(response.body)['installed']).to be(false)
      end
    end
  end

  describe 'GET /api/v1/editor/{id}/start' do
    let(:attachment) do
      create(:attachment, attachable: user.container, created_by: user.id, created_for: user.id)
    end

    context 'when no document server is configured (REQ-ELN-28)' do
      before do
        allow(Rails.configuration).to receive(:editors).and_return(nil)
        get "/api/v1/editor/#{attachment.id}/start"
      end

      it 'responds 503 with a clear error instead of a nil-crash 500' do
        expect(response).to have_http_status(:service_unavailable)
        expect(JSON.parse(response.body)['error']).to include('not configured')
      end
    end
  end
end
