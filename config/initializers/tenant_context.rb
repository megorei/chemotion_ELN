# frozen_string_literal: true

# Boot-time tenant validation.
#
# Multi-tenant deployments must identify their tenant: fail fast with a clear
# message instead of running with an ambiguous identity. Single-tenant
# deployments (MULTI_TENANT unset) silently use the default context and are
# unaffected. This initializer also runs for delayed_job workers, which boot
# the full Rails environment via bin/delayed_job -> config/environment.
if TenantContext.multi_tenant? && TenantContext.current.default?
  raise TenantContext::MissingTenantError,
        'MULTI_TENANT=true but TENANT_ID is not set. Set TENANT_ID (and ' \
        'optionally TENANT_NAME, TENANT_DOMAIN) in the environment, or unset ' \
        'MULTI_TENANT to run single-tenant.'
end
