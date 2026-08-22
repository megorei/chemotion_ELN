# frozen_string_literal: true

# WP 05 (REQ-ELN-5): ActiveRecord::Encryption key setup.
#
# Keys are operator/tenant bootstrap secrets and come from ENV (Absolute tier):
#
#   ACTIVE_RECORD_ENCRYPTION_PRIMARY_KEY
#   ACTIVE_RECORD_ENCRYPTION_KEY_DERIVATION_SALT
#   ACTIVE_RECORD_ENCRYPTION_DETERMINISTIC_KEY   (optional — no deterministic
#                                                 encryption is used yet)
#
# In development/test, missing keys are derived deterministically from
# secret_key_base so encrypted attributes work with zero setup. In production,
# missing keys leave encryption unconfigured: boot proceeds unchanged
# (single-tenant instances that never store DB secrets are unaffected) and the
# first attempt to encrypt raises a clear error (see MatriceSecret).
#
# NOTE: this file must sort before devise.rb — the OmniAuth registration there
# decrypts matrice secrets at boot. Initializers load alphabetically, so
# active_record_encryption.rb is safe.
primary_key = ENV['ACTIVE_RECORD_ENCRYPTION_PRIMARY_KEY'].presence
deterministic_key = ENV['ACTIVE_RECORD_ENCRYPTION_DETERMINISTIC_KEY'].presence
key_derivation_salt = ENV['ACTIVE_RECORD_ENCRYPTION_KEY_DERIVATION_SALT'].presence

if !(primary_key && key_derivation_salt) && (Rails.env.development? || Rails.env.test?)
  derive = lambda do |purpose|
    OpenSSL::HMAC.hexdigest('SHA256', Rails.application.secret_key_base, "active_record_encryption.#{purpose}")
  end
  primary_key ||= derive.call('primary_key')
  deterministic_key ||= derive.call('deterministic_key')
  key_derivation_salt ||= derive.call('key_derivation_salt')
  Rails.logger&.info(
    'ActiveRecord::Encryption: ACTIVE_RECORD_ENCRYPTION_* not set - using keys derived from ' \
    'secret_key_base (development/test convenience only).',
  )
end

ActiveSupport.on_load(:active_record) do
  if primary_key && key_derivation_salt
    ActiveRecord::Encryption.configure(
      primary_key: primary_key,
      deterministic_key: deterministic_key,
      key_derivation_salt: key_derivation_salt,
    )
  else
    Rails.logger&.warn(
      'ActiveRecord::Encryption: no keys configured - encrypted attributes (matrice secrets) are ' \
      'unavailable until ACTIVE_RECORD_ENCRYPTION_PRIMARY_KEY and ' \
      'ACTIVE_RECORD_ENCRYPTION_KEY_DERIVATION_SALT are set.',
    )
  end
end
