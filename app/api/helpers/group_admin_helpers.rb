# frozen_string_literal: true

# Deny-by-default group-scope gate for Grape endpoints.
#
# Group-admin truth lives in the `users_admins` join and is resolved in ONE
# place — Group#administrated_by? — so GroupPolicy and these helpers cannot
# drift.
#
# current_user comes from the API root's detect_current_user, i.e. the gate
# behaves identically for session-, api-token- and JWT-authenticated callers.
module GroupAdminHelpers
  extend Grape::API::Helpers

  # Instance Admins (STI type Admin) keep their instance-wide surface;
  # everyone else must be a group admin of exactly `group`.
  def require_group_admin!(group)
    error!('401 Unauthorized', 401) unless group_admin_of?(group)
  end

  def group_admin_of?(group)
    return false if current_user.nil?
    return true if current_user.is_a?(Admin)

    group.is_a?(Group) && group.administrated_by?(current_user)
  end

  # All group ids the current user administrates.
  def administrated_group_ids
    return [] if current_user.nil?
    # Admin/Group STI types have no users_admins association
    return [] unless current_user.respond_to?(:administrated_accounts)

    current_user.administrated_accounts.where(type: 'Group').ids
  end

  # Ids of every user the current user may act on in a group-admin capacity.
  def administrated_member_ids
    UsersGroup.where(group_id: administrated_group_ids).distinct.pluck(:user_id)
  end
end
