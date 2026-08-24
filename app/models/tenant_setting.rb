# frozen_string_literal: true

# WP 03 (REQ-ELN-31, REQ-ELN-7): the DB (Tenant-set) tier of the AppConfig
# resolver. One row per overridden setting: `section` names the config domain,
# `key` is the dot-joined path inside it (e.g. 'docserver.callback_server'),
# `value` is the raw JSON value (scalar or subtree).
#
# Only the sections delegated to tenant admins by the inventory §0 review
# (Lars, 2026-08-24) are legal — SECTIONS is the explicit whitelist; nothing
# outside it is DB-backed (spec §5.3a: per-section explicit declaration).
#
# Secret-valued keys (SECRET_KEYS) must NOT be stored here in plaintext: they
# are routed to the encrypted sibling TenantSettingSecret (same pattern as
# matrice_secrets, WP 05). Use TenantSetting.write — it enforces the routing.
class TenantSetting < ApplicationRecord
  # The Tenant-set whitelist (inventory §0 decisions, 2026-08-24):
  #   #1 service URLs — tenant may attach own instances (operator default = pooled services)
  #   #2 smtp — fully tenant-set incl. credentials (operator relay = default)
  #   #3 UX defaults — profile_default, ui_components, user_props
  #   #4 datacite — tenant-set with operator default incl. credentials
  #   plus: radar, datacollectors, scifinder_n, editors (imprint/docserver),
  #   messaging (MESSAGE_* knobs) and the signup flags (§4.2).
  SECTIONS = %w[
    converter
    spectra
    indigo_service
    ketcher_service
    editors
    structure_editors
    scifinder_n
    inference
    smtp
    ui_components
    profile_default
    user_props
    radar
    datacollectors
    messaging
    datacite
    signup
  ].freeze

  # Dot-joined key paths whose values are credentials — these are stored
  # encrypted in tenant_setting_secrets, never in `value` (REQ-ELN-5 pattern).
  SECRET_KEYS = {
    'smtp' => %w[password],
    'radar' => %w[client_secret],
    'converter' => %w[secret_key],
    'datacite' => %w[api_password],
    'datacollectors' => %w[mailcollector.password],
  }.freeze

  # Placeholder served instead of secret values (same convention as Matrice).
  SECRET_PLACEHOLDER = '********'

  KEY_FORMAT = /\A[a-z0-9_]+(\.[a-z0-9_]+)*\z/.freeze

  belongs_to :updated_by_user, class_name: 'User', foreign_key: :updated_by, optional: true, inverse_of: false

  validates :section, presence: true, inclusion: { in: SECTIONS }
  validates :key, presence: true, format: { with: KEY_FORMAT }, uniqueness: { scope: :section }
  validate :secret_keys_must_use_encrypted_store

  # after_save/after_destroy (not after_commit) so the bust also fires under
  # transactional tests; a bust on a rolled-back write only costs a cache miss.
  after_save { AppConfig.bust! }
  after_destroy { AppConfig.bust! }

  class << self
    def secret_key?(section, key)
      SECRET_KEYS.fetch(section.to_s, []).include?(key.to_s)
    end

    # The one write path (admin API / operator tooling). Routes secret-valued
    # keys to TenantSettingSecret; a nil value removes the override so the
    # resolver falls back to the ENV/yml tiers. Busts the AppConfig cache via
    # the model callbacks.
    def write(section:, key:, value:, updated_by: nil)
      section = section.to_s
      key = key.to_s
      raise ArgumentError, "section not tenant-settable: #{section}" unless SECTIONS.include?(section)

      if secret_key?(section, key)
        return TenantSettingSecret.write(section: section, key: key, value: value, updated_by: updated_by)
      end

      if value.nil?
        find_by(section: section, key: key)&.destroy!
        nil
      else
        record = find_or_initialize_by(section: section, key: key)
        record.update!(value: value, updated_by: user_id(updated_by))
        record
      end
    end

    def user_id(user)
      user.is_a?(User) ? user.id : user
    end
  end

  private

  def secret_keys_must_use_encrypted_store
    return unless self.class.secret_key?(section, key)

    errors.add(:key, "'#{key}' is secret-valued and must be stored encrypted (TenantSettingSecret)")
  end
end
