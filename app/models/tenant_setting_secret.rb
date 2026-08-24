# frozen_string_literal: true

# WP 03 (REQ-ELN-31 + REQ-ELN-5 pattern): encrypted-at-rest storage for
# secret-valued tenant settings (TenantSetting::SECRET_KEYS — smtp password,
# radar client_secret, converter secret_key, ...). Sibling of TenantSetting,
# modeled after MatriceSecret (WP 05): `key` is the dot-joined path inside the
# section, `secret` is encrypted with ActiveRecord::Encryption
# (non-deterministic).
#
# Values are write-only towards clients: AppConfig merges them back into the
# resolved section exclusively for server-side consumers; AppConfig.effective
# and the tenant-settings API serve TenantSetting::SECRET_PLACEHOLDER instead.
class TenantSettingSecret < ApplicationRecord
  encrypts :secret

  validates :section, presence: true, inclusion: { in: TenantSetting::SECTIONS }
  validates :key, presence: true, uniqueness: { scope: :section }

  before_save :ensure_encryption_configured!

  after_save { AppConfig.bust! }
  after_destroy { AppConfig.bust! }

  class << self
    def encryption_configured?
      ActiveRecord::Encryption.config.primary_key.present? &&
        ActiveRecord::Encryption.config.key_derivation_salt.present?
    end

    # Upsert-or-remove, mirroring TenantSetting.write semantics (nil unsets).
    def write(section:, key:, value:, updated_by: nil)
      if value.nil?
        find_by(section: section, key: key)&.destroy!
        nil
      else
        record = find_or_initialize_by(section: section, key: key)
        record.update!(secret: value.to_s, updated_by: TenantSetting.user_id(updated_by))
        record
      end
    end
  end

  private

  def ensure_encryption_configured!
    return if self.class.encryption_configured?

    raise ActiveRecord::Encryption::Errors::Configuration,
          'ActiveRecord::Encryption is not configured — set ACTIVE_RECORD_ENCRYPTION_PRIMARY_KEY and ' \
          'ACTIVE_RECORD_ENCRYPTION_KEY_DERIVATION_SALT in the environment before storing tenant ' \
          'setting secrets (see docs/security-baseline.md).'
  end
end
