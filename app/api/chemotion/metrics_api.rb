# frozen_string_literal: true

module Chemotion
  # WP 09 (§9 NFR Observability): per-tenant operational metrics in Prometheus
  # text format, hand-rolled (no client gem — the handful of gauges here does
  # not justify a second instrumentation stack next to Sentry).
  #
  # Lives under /api/v1/public (the auth-exempt path prefix in
  # API#public_request?) but is token-gated: while ENV METRICS_TOKEN is unset
  # the endpoint answers 404 (feature off = invisible; single-tenant
  # deployments are unchanged). When set, the scraper must present the token
  # via ?token= or the X-Metrics-Token header.
  class MetricsAPI < Grape::API
    format :txt
    content_type :txt, 'text/plain'

    helpers do
      def prometheus_body
        version = Chemotion::Application.config.version['version'].to_s.gsub('"', '\"')
        tenant = TenantContext.current.id || 'single'
        db_up = Usecases::Public::HealthCheck.database_ready?
        lines = [
          '# TYPE app_info gauge',
          %(app_info{version="#{version}",tenant="#{tenant}"} 1),
          '# TYPE db_up gauge',
          "db_up #{db_up ? 1 : 0}",
        ]
        lines.concat(database_metrics) if db_up
        "#{lines.join("\n")}\n"
      end

      # Cheap COUNT/SUM queries only — this endpoint is scraped periodically.
      def database_metrics
        [
          "users_total #{Person.count}",
          "active_users_24h #{User.where(current_sign_in_at: 24.hours.ago..).count}",
          "delayed_jobs_queued #{Delayed::Job.where(failed_at: nil).count}",
          "delayed_jobs_failed #{Delayed::Job.where.not(failed_at: nil).count}",
          "audit_events_total #{AuditEvent.count}",
          "storage_used_bytes #{User.sum(:used_space).to_i}",
        ]
      end

      def metrics_token_supplied
        params[:token].presence || headers['X-Metrics-Token'].presence
      end
    end

    namespace :public do
      desc 'Prometheus metrics (active only when ENV METRICS_TOKEN is configured)'
      params do
        optional :token, type: String, desc: 'metrics token (alternative: X-Metrics-Token header)'
      end
      get :metrics do
        configured = ENV.fetch('METRICS_TOKEN', nil)
        error!('404 Not Found', 404) if configured.blank?

        supplied = metrics_token_supplied
        unless supplied && ActiveSupport::SecurityUtils.secure_compare(supplied, configured)
          error!('401 Unauthorized', 401)
        end

        prometheus_body
      end
    end
  end
end
