# frozen_string_literal: true

# REQ-ELN-20c (P1 WP 06): the single predicate for "how much may an external
# guest be granted". Also the permission gate P2's copy flow checks
# (REQ-ELN-21d) — call sites must not re-derive policy from ENV/settings.
#
# Resolution:
#   - non-guests are uncapped (returns nil)
#   - switch off (default): hard read-only cap 0
#   - switch on: guests.max_permission_level, further restricted by the most
#     restrictive per-group cap among the GRANTOR's administered-or-joined
#     groups (a Group Admin may restrict, never extend, the tenant allowance)
#   - everything is clamped to TenantContext::GUEST_PERMISSION_HARD_CEILING
#     (< manage_shares) — externals never manage shares, whatever is configured
#
# Deliberate tier semantics (recorded in planning WP 06): the legacy ENV
# TENANT_GUEST_MAX_PERMISSION_LEVEL participates as the env-default tier of
# guests.max_permission_level, so a Tenant-set (DB) value overrides it within
# the hard ceiling. The operator-absolute clamp is the hard ceiling itself.
module GuestPolicy
  module_function

  TRUTHY = %w[1 true yes on].freeze

  # Explicitly set (tenant-set or ENV) the switch wins. When it is UNSET, a
  # positive legacy ENV cap counts as "on" — operators who configured
  # TENANT_GUEST_MAX_PERMISSION_LEVEL before this switch existed meant
  # escalation to be active (recorded in planning WP 06).
  def escalation_enabled?
    raw = AppConfig.get(:guests, :write_escalation).to_s.strip
    return TRUTHY.include?(raw.downcase) unless raw.empty?

    AppConfig.get(:guests, :max_permission_level).to_i.positive?
  end

  # The cap that applies to ANY external recipient — also usable before an
  # invited identity has a user row (pending invitations).
  def external_cap(grantor: nil, group: nil)
    return 0 unless escalation_enabled?

    level = AppConfig.get(:guests, :max_permission_level).to_i
    group_caps(grantor, group).each { |cap| level = [level, cap].min }
    level.clamp(0, TenantContext::GUEST_PERMISSION_HARD_CEILING)
  end

  # => Integer cap for external users, nil (uncapped) for locals.
  def max_level_for(user, grantor: nil, group: nil)
    return nil unless user.respond_to?(:external) && user.external

    external_cap(grantor: grantor, group: group)
  end

  # A grant at +requested+ for +user+ is allowed under the current policy?
  def allows?(user, requested, grantor: nil, group: nil)
    cap = max_level_for(user, grantor: grantor, group: group)
    cap.nil? || requested.to_i <= cap
  end

  def group_caps(grantor, group)
    caps = []
    caps << group.guest_max_permission_level if group.respond_to?(:guest_max_permission_level)
    if grantor.respond_to?(:groups)
      caps.concat(grantor.groups.filter_map(&:guest_max_permission_level))
    end
    caps.compact
  end
end
