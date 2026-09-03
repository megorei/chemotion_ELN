# frozen_string_literal: true

# == Schema Information
#
# Table name: matrice_secrets
#
#  id         :bigint           not null, primary key
#  key        :string           not null
#  secret     :text
#  created_at :datetime         not null
#  updated_at :datetime         not null
#  matrice_id :bigint           not null
#
# Indexes
#
#  index_matrice_secrets_on_matrice_id_and_key  (matrice_id,key) UNIQUE
#
# Foreign Keys
#
#  fk_rails_...  (matrice_id => matrices.id)
#
# WP 05 (REQ-ELN-5): encrypted-at-rest storage for secret values extracted from
# Matrice#configs. `key` is the dot-joined path of the secret inside the configs
# JSONB (e.g. 'github.client_secret', 'hmac_secret'); `secret` is encrypted with
# ActiveRecord::Encryption (non-deterministic).
#
# Values in this table are write-only towards clients: they are merged back into
# configs exclusively for server-side consumers (Matrice#configs_with_secrets,
# the OmniAuth registration in config/initializers/devise.rb) and never
# serialized into API entities (Entities::MatriceEntity masks them).
class MatriceSecret < ApplicationRecord
  belongs_to :matrice, -> { with_deleted }, inverse_of: :matrice_secrets

  encrypts :secret

  validates :key, presence: true, uniqueness: { scope: :matrice_id }

  before_save :ensure_encryption_configured!

  def self.encryption_configured?
    ActiveRecord::Encryption.config.primary_key.present? &&
      ActiveRecord::Encryption.config.key_derivation_salt.present?
  end

  private

  def ensure_encryption_configured!
    return if self.class.encryption_configured?

    raise ActiveRecord::Encryption::Errors::Configuration,
          'ActiveRecord::Encryption is not configured — set ACTIVE_RECORD_ENCRYPTION_PRIMARY_KEY and ' \
          'ACTIVE_RECORD_ENCRYPTION_KEY_DERIVATION_SALT in the environment before storing matrice ' \
          'secrets (see docs/security-baseline.md).'
  end
end
