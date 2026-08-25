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

    # Rack request log tag for config.log_tags (WP 09): the tenant id, or
    # 'single' when no TENANT_ID is configured, so operator-side log
    # aggregation can always key on the first tag of a line.
    def log_tag
      ->(_request) { current.id || 'single' }
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

  # Tenant-wide storage budget in GB. 0 / unset = unlimited (matching the
  # allocated_space convention on users, where 0 means infinite). Group
  # quotas (GroupSettingsAPI, WP 07 / REQ-ELN-14) are validated against this
  # at write time; enforcing the budget at upload time is a documented
  # follow-up. Read per call (not memoized) like public_url.
  def storage_quota_gb
    ENV['TENANT_STORAGE_QUOTA_GB'].to_i
  end

  def storage_quota_bytes
    storage_quota_gb * (1024**3)
  end

  # Inbound collaboration policy (REQ-ELN-16/17, P1 WP 01): governs whether
  # federated identities from OTHER tenants may enter as guests.
  #
  #   off        - default; today's behaviour exactly (unknown federated
  #                identities go through the normal registration flow).
  #   federation - guest gate engaged: only identities holding a pending or
  #                active GuestGrant are admitted (provisioned as external
  #                guests); everyone else is denied.
  #   open       - reserved; currently gates like 'federation'. The
  #                federation/open differentiation (which federations are
  #                trusted, grant-less entry) is WP 03 resolver scope.
  #
  # Interim ENV read until the WP 03 tenant-config resolver lands (same
  # pattern as storage_quota_gb). Unknown values fail closed to 'off'.
  INBOUND_COLLABORATION_POLICIES = %w[off federation open].freeze

  def inbound_collaboration
    value = ENV.fetch('TENANT_INBOUND_COLLABORATION', 'off')
    INBOUND_COLLABORATION_POLICIES.include?(value) ? value : 'off'
  end

  def inbound_collaboration?
    inbound_collaboration != 'off'
  end

  # Ceiling for permission levels grantable to external guests (P1 WP 02,
  # REQ-ELN-17): default read-only (0); the operator may raise it via
  # TENANT_GUEST_MAX_PERMISSION_LEVEL, but never to manage_shares (4) or
  # above — external identities must not administrate shares. Same interim
  # ENV pattern as inbound_collaboration; garbage values fail closed to 0.
  GUEST_PERMISSION_HARD_CEILING = 3 # < CollectionShare::PERMISSION_LEVELS[:manage_shares]

  def guest_max_permission_level
    Integer(ENV.fetch('TENANT_GUEST_MAX_PERMISSION_LEVEL', 0)).clamp(0, GUEST_PERMISSION_HARD_CEILING)
  rescue ArgumentError
    0
  end
end
