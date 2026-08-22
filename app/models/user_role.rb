# frozen_string_literal: true

# A first-class role grant (WP 06 / REQ-ELN-11+13): `name` optionally scoped by
# (scope_type, scope_id). Replaces the legacy boolean/hash role flags that lived
# in the JSONB profile.data next to UI preferences.
#
# Deliberately NOT paranoid: a revoked role is a deleted row. The audit trail
# (who/when/what scope) is carried by `granted_by` + timestamps on the live row
# and by structured `user_role.granted` / `user_role.revoked` log lines emitted
# on every create/destroy — do not add acts_as_paranoid here.
class UserRole < ApplicationRecord
  TEMPLATES_MODERATOR = 'templates_moderator'
  MOLECULE_EDITOR = 'molecule_editor'
  CONVERTER_ADMIN = 'converter_admin'
  GLOBAL_TEXT_TEMPLATE_EDITOR = 'global_text_template_editor'
  GENERIC_ADMIN = 'generic_admin'
  # WP 07 (REQ-ELN-12): first-class group adminship, always scoped to exactly
  # one group (scope_type: GROUP_ADMIN_SCOPE, scope_id: <Group#id>). NOTE the
  # duality: the legacy `users_admins` join remains the authoritative source of
  # group adminship (WP 06 deliberately did not backfill it); rows here are
  # honored ADDITIONALLY via Group#administrated_by?. Migrating users_admins
  # into user_roles is a WP 07 part-2 / WP 08 decision.
  GROUP_ADMIN = 'group_admin'
  GROUP_ADMIN_SCOPE = 'group'

  # Operator-defined grantable set (REQ-ELN-13): role names cannot be invented
  # ad hoc by a (tenant) admin — extend this list deliberately.
  NAMES = [
    TEMPLATES_MODERATOR,
    MOLECULE_EDITOR,
    CONVERTER_ADMIN,
    GLOBAL_TEXT_TEMPLATE_EDITOR,
    GENERIC_ADMIN,
    GROUP_ADMIN,
  ].freeze

  # The generic_admin scopes mirror the legacy profile.data hash keys — the
  # client contract ({ elements, segments, datasets }) and labimotion's
  # authenticate_admin! both rely on exactly these strings.
  GENERIC_ADMIN_SCOPES = %w[elements segments datasets].freeze

  # Legacy boolean profile.data flag -> role name
  FLAG_ROLE_MAP = {
    'is_templates_moderator' => TEMPLATES_MODERATOR,
    'molecule_editor' => MOLECULE_EDITOR,
    'converter_admin' => CONVERTER_ADMIN,
    'global_text_template_editor' => GLOBAL_TEXT_TEMPLATE_EDITOR,
  }.freeze

  belongs_to :user
  belongs_to :granter, class_name: 'User', foreign_key: :granted_by, optional: true, inverse_of: false

  # Set by User#revoke_role! so the destroy audit line can record the actor.
  attr_accessor :revoked_by

  validates :name, presence: true,
                   inclusion: { in: NAMES },
                   uniqueness: { scope: %i[user_id scope_type scope_id] }
  validate :scope_matches_role

  after_create :audit_grant, :sync_converter_admin_mirror
  after_destroy :audit_revoke, :sync_converter_admin_mirror

  # Idempotently extracts the legacy role flags from every profile.data into
  # user_roles rows (unscoped tenant-wide roles for the boolean flags, scoped
  # (generic_admin, <scope>) roles for the generic_admin hash), then strips the
  # extracted keys from profile.data. The 'converter_admin' key is kept in sync
  # as a compatibility mirror: labimotion's ConverterAPI reads
  # profile.data['converter_admin'] directly (labimotion 2.3.0 converter_api.rb:14).
  def self.backfill_from_profile_data!
    Profile.includes(:user).find_each do |profile|
      extract_profile!(profile) if profile.user.present?
    end
  end

  def self.extract_profile!(profile)
    user = profile.user
    data = profile.data || {}
    FLAG_ROLE_MAP.each do |flag, role_name|
      user.grant_role!(role_name) if data[flag] == true
    end
    extract_generic_admin!(user, data['generic_admin'])

    # Strip the extracted flags; 'converter_admin' stays as compatibility mirror.
    extracted_keys = FLAG_ROLE_MAP.keys - [CONVERTER_ADMIN] + ['generic_admin']
    return unless extracted_keys.any? { |key| data.key?(key) }

    profile.update_columns(data: data.except(*extracted_keys)) # rubocop:disable Rails/SkipsModelValidations
  end
  private_class_method :extract_profile!

  def self.extract_generic_admin!(user, generic)
    return unless generic.is_a?(Hash)

    GENERIC_ADMIN_SCOPES.each do |scope|
      user.grant_role!(GENERIC_ADMIN, scope_type: scope) if generic[scope] == true
    end
  end
  private_class_method :extract_generic_admin!

  private

  def scope_matches_role
    case name
    when GENERIC_ADMIN then validate_generic_admin_scope
    when GROUP_ADMIN then validate_group_admin_scope
    else validate_tenant_wide_scope
    end
  end

  def validate_generic_admin_scope
    errors.add(:scope_type, "must be one of #{GENERIC_ADMIN_SCOPES.join(', ')}") unless
      GENERIC_ADMIN_SCOPES.include?(scope_type)
  end

  def validate_group_admin_scope
    errors.add(:scope_type, "must be '#{GROUP_ADMIN_SCOPE}'") unless scope_type == GROUP_ADMIN_SCOPE
    errors.add(:scope_id, 'must reference a group') if scope_id.blank?
  end

  def validate_tenant_wide_scope
    return if scope_type.blank? && scope_id.blank?

    errors.add(:scope_type, "#{name} is a tenant-wide role and cannot be scoped")
  end

  def audit_grant
    audit('user_role.granted', granted_by)
  end

  def audit_revoke
    audit('user_role.revoked', revoked_by)
  end

  def audit(event, actor_id)
    Rails.logger.info(
      {
        event: event,
        user_id: user_id,
        role: name,
        scope_type: scope_type,
        scope_id: scope_id,
        by: actor_id,
        at: Time.zone.now.iso8601,
      }.to_json,
    )
  end

  # TEMPORARY compatibility mirror: labimotion's ConverterAPI authorizes via
  # current_user.profile.data['converter_admin'] (a direct JSONB read that
  # bypasses the User facade). Keep the flag in sync until labimotion reads the
  # role API; every other legacy flag is gone from profile.data.
  def sync_converter_admin_mirror
    return unless name == CONVERTER_ADMIN

    profile = user&.profile
    return if profile.nil?

    granted = self.class.exists?(user_id: user_id, name: CONVERTER_ADMIN)
    profile.update_columns(data: (profile.data || {}).merge(CONVERTER_ADMIN => granted)) # rubocop:disable Rails/SkipsModelValidations
  end
end
