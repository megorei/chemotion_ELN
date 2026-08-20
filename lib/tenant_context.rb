# frozen_string_literal: true

# Deploy-time tenant identity for this process. Each stack serves exactly one
# tenant, so the context is read once from ENV and memoized for the process
# lifetime (web and delayed_job workers boot the same initializer path).
#
#   TENANT_ID     - stable tenant slug (e.g. "kit"); absent in single-tenant
#                   deployments. Without it, +current+ returns a default
#                   context (id nil) and the app behaves exactly as before.
#   TENANT_NAME   - human-readable display name of the tenant
#   TENANT_DOMAIN - primary domain of the tenant
#
# Instance-identity reads (PUBLIC_URL, APPLICATION_TITLE) also go through this
# class so tenant identity does not scatter ENV lookups across the codebase.
# ENV stays the source of truth; this class is the single read path.
#
# NOTE: required explicitly from config/application.rb because the PUBLIC_URL
# handling there runs at config time, before autoloading is available.
class TenantContext
  DEFAULT_PUBLIC_URL = 'http://localhost:3000'
  DEFAULT_APPLICATION_TITLE = 'Chemotion'

  # Raised at boot when MULTI_TENANT=true but no TENANT_ID is configured
  # (see config/initializers/tenant_context.rb).
  class MissingTenantError < StandardError; end

  attr_reader :id, :name, :domain

  class << self
    # Memoized per process; ENV is read on first access (boot).
    def current
      @current ||= new(
        id: ENV['TENANT_ID'].presence,
        name: ENV['TENANT_NAME'].presence,
        domain: ENV['TENANT_DOMAIN'].presence,
      )
    end

    def multi_tenant?
      ENV['MULTI_TENANT'] == 'true'
    end

    # Test hook: drop the memoized context so the next +current+ re-reads ENV.
    def reset!
      @current = nil
    end
  end

  def initialize(id: nil, name: nil, domain: nil)
    @id = id
    @name = name
    @domain = domain
    freeze
  end

  # Single-tenant fallback: no TENANT_ID configured.
  def default?
    id.nil?
  end

  # Raw PUBLIC_URL (nil when unset). Call sites keep their historical
  # fallbacks where they differ (content_security_policy.rb uses '').
  def public_url
    ENV.fetch('PUBLIC_URL', nil)
  end

  # Root URI of this instance with the historical default, as previously
  # computed in config/application.rb and config/initializers/mail.rb.
  def root_uri
    URI.parse(public_url || DEFAULT_PUBLIC_URL)
  end

  def application_title
    ENV['APPLICATION_TITLE'].presence || DEFAULT_APPLICATION_TITLE
  end
end
