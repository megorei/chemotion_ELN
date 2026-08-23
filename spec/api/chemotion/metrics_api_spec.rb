# frozen_string_literal: true

require 'rails_helper'

# WP 09 (§9 NFR Observability): token-gated Prometheus metrics under the
# auth-exempt /api/v1/public prefix. Without ENV METRICS_TOKEN the endpoint is
# invisible (404) — single-tenant deployments are unchanged.
describe Chemotion::MetricsAPI do
  def stub_metrics_token(value)
    allow(ENV).to receive(:fetch).and_call_original
    allow(ENV).to receive(:fetch).with('METRICS_TOKEN', nil).and_return(value)
  end

  describe 'GET /api/v1/public/metrics' do
    context 'when METRICS_TOKEN is not configured' do
      it 'responds 404 (feature off = invisible)' do
        stub_metrics_token(nil)
        get '/api/v1/public/metrics', params: { token: 'anything' }
        expect(response).to have_http_status(:not_found)
      end
    end

    context 'when METRICS_TOKEN is configured' do
      before { stub_metrics_token('s3cret') }

      it 'responds 401 without a token' do
        get '/api/v1/public/metrics'
        expect(response).to have_http_status(:unauthorized)
      end

      it 'responds 401 with a wrong token' do
        get '/api/v1/public/metrics', params: { token: 'wrong' }
        expect(response).to have_http_status(:unauthorized)
      end

      it 'responds 200 with the query-param token' do
        get '/api/v1/public/metrics', params: { token: 's3cret' }
        expect(response).to have_http_status(:ok)
      end

      it 'responds 200 with the X-Metrics-Token header' do
        get '/api/v1/public/metrics', headers: { 'X-Metrics-Token' => 's3cret' }
        expect(response).to have_http_status(:ok)
      end

      it 'renders Prometheus text format with the expected gauges', :aggregate_failures do
        create(:person)
        AuditEvent.record(action: 'spec.event')

        get '/api/v1/public/metrics', params: { token: 's3cret' }

        expect(response.media_type).to eq('text/plain')
        body = response.body
        expect(body).to match(/^app_info\{version="[^"]*",tenant="single"\} 1$/)
        expect(body).to include("db_up 1\n")
        expect(body).to match(/^users_total \d+$/)
        expect(body).to match(/^active_users_24h \d+$/)
        expect(body).to match(/^delayed_jobs_queued \d+$/)
        expect(body).to match(/^delayed_jobs_failed \d+$/)
        expect(body).to match(/^audit_events_total [1-9]\d*$/)
        expect(body).to match(/^storage_used_bytes \d+$/)
      end
    end
  end
end
