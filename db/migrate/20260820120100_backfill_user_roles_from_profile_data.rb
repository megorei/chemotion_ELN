# frozen_string_literal: true

# Data migration (WP 06): extract the legacy role flags from profile.data into
# user_roles rows. Delegates to UserRole.backfill_from_profile_data!, which is
# idempotent (find_or_create semantics, flags are stripped after extraction) and
# covered by spec/models/user_role_spec.rb.
class BackfillUserRolesFromProfileData < ActiveRecord::Migration[6.1]
  def up
    say_with_time('backfilling user_roles from profile.data role flags') do
      UserRole.reset_column_information
      UserRole.backfill_from_profile_data!
    end
  end

  def down
    # Roles are additive; reversing would destroy grants made after the
    # backfill. Intentionally irreversible-as-no-op.
  end
end
