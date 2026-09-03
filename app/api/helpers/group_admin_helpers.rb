# frozen_string_literal: true

# WP 07 (REQ-ELN-12): deny-by-default group-scope gate for Grape endpoints.
#
# Group-admin truth is DUAL during the RBAC migration:
# - the legacy `users_admins` join is today's authoritative source (WP 06
#   deliberately did not backfill it into user_roles);
# - first-class `user_roles` grants (name: 'group_admin', scope_type: 'group',
#   scope_id: <Group#id>) are honored additionally.
# Both are resolved in ONE place — Group#administrated_by? — so GroupPolicy and
# these helpers cannot drift. Collapsing users_admins into user_roles is a
# WP 07 part-2 / WP 08 decision.
#
# current_user comes from the API root's detect_current_user, i.e. the gate
# behaves identically for session-, api-token- and JWT-authenticated callers.
module GroupAdminHelpers
  extend Grape::API::Helpers

  # Instance Admins (STI type Admin) keep their tenant-wide surface; everyone
  # else must be a group admin of exactly `group`.
  def require_group_admin!(group)
    error!('401 Unauthorized', 401) unless group_admin_of?(group)
  end

  def group_admin_of?(group)
    return false if current_user.nil?
    return true if current_user.is_a?(Admin)

    group.is_a?(Group) && group.administrated_by?(current_user)
  end

  # All group ids the current user administrates — union of both sources.
  def administrated_group_ids
    return [] if current_user.nil?

    legacy_ids =
      if current_user.respond_to?(:administrated_accounts)
        current_user.administrated_accounts.where(type: 'Group').ids
      else
        [] # Admin/Group STI types have no users_admins association
      end
    granted_ids = current_user.user_roles
                              .where(name: UserRole::GROUP_ADMIN, scope_type: UserRole::GROUP_ADMIN_SCOPE)
                              .pluck(:scope_id)
    (legacy_ids + granted_ids).uniq
  end

  # Ids of every user the current user may act on in a group-admin capacity.
  def administrated_member_ids
    UsersGroup.where(group_id: administrated_group_ids).distinct.pluck(:user_id)
  end
end
