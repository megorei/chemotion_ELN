# frozen_string_literal: true

# == Schema Information
#
# Table name: matrices
#
#  id          :integer          not null, primary key
#  name        :string           not null
#  enabled     :boolean          default(FALSE)
#  label       :string
#  include_ids :integer          default([]), is an Array
#  exclude_ids :integer          default([]), is an Array
#  configs     :jsonb            not null
#  created_at  :datetime
#  updated_at  :datetime
#  deleted_at  :datetime
#
# Indexes
#
#  index_matrices_on_name  (name) UNIQUE
#
class Matrice < ApplicationRecord
  include SequenceUtilities

  # WP 05 (REQ-ELN-5): config keys whose values are secrets. On save they are
  # moved out of the configs JSONB into the encrypted matrice_secrets store;
  # serialization (Entities::MatriceEntity) only ever sees a masked placeholder.
  SECRET_CONFIG_KEYS = %w[client_secret hmac_secret receiving_secret cas_api_key].freeze
  SECRET_PLACEHOLDER = '********'

  acts_as_paranoid
  has_many :matrice_secrets, dependent: :destroy, autosave: true, inverse_of: :matrice
  before_save :extract_secrets_from_configs
  before_create :clean_invalid_ids
  before_create :reset_sequence
  after_create :gen_json
  after_destroy :gen_json

  def self.gen_matrices_json
    mx = pluck(:name, :id).to_h || {}
  rescue ActiveRecord::StatementInvalid, PG::ConnectionBad, PG::UndefinedTable
    mx = {}
  ensure
    Rails.root.join('config/matrices.json').write(
      mx.to_json.concat("\n"),
    )
  end

  def self.extra_rules
    configs = find_by(name: 'userProvider')&.configs || {}
    configs.dig('extra_rules', 'enable') == true ? configs['extra_rules'] : {}
  end

  def self.molecule_viewer
    configs_for('moleculeViewer')
  end

  def self.fast_input
    # server-side consumer (Chemotion::CasLookupService) needs the decrypted
    # cas_api_key — never serialize this into an API response.
    configs_for('fastInput', with_secrets: true)
  end

  def self.configs_for(name, with_secrets: false)
    rec = find_by(name: name)
    configs = (with_secrets ? rec&.configs_with_secrets : rec&.configs) || {}
    { feature_enabled: rec&.enabled || false }.merge(configs).deep_symbolize_keys.with_indifferent_access
  end

  private_class_method :configs_for

  # configs with the decrypted secrets merged back in. Server-side use only —
  # NEVER serialize the result into an API response.
  def configs_with_secrets
    merged = (configs || {}).deep_dup
    matrice_secrets.each do |record|
      write_config_path(merged, record.key, record.secret)
    end
    merged
  end

  # configs safe for serialization: every stored secret appears as
  # SECRET_PLACEHOLDER (presence indicator) and any residual plaintext value
  # under a secret-named key is masked as well (defense in depth for rows not
  # yet migrated via secrets:migrate_matrices).
  def masked_configs
    masked = (configs || {}).deep_dup
    mask_secret_leaves!(masked)
    matrice_secrets.pluck(:key).each do |key|
      write_config_path(masked, key, SECRET_PLACEHOLDER)
    end
    masked
  end

  # dot-joined paths of plaintext secrets still sitting in the configs JSONB
  # (used by the secrets:migrate_matrices task).
  def plaintext_secret_paths
    collect_secret_leaves(configs || {}, [])
  end

  private

  def gen_json
    Matrice.gen_matrices_json
  end

  # WP 05: route secret-named config values into the encrypted store and strip
  # them from the JSONB. A SECRET_PLACEHOLDER value round-tripping back from the
  # admin UI keeps the stored secret (write-only contract); blank values are
  # left untouched (seeded '' placeholders act as "not configured").
  # Guarded to Hash: mid-migration-history saves (e.g. 20210222154608 on a
  # fresh DB) see the pre-JSONB string default '{}' here.
  def extract_secrets_from_configs
    return unless configs.is_a?(Hash)
    return if configs.blank?

    updated = configs.deep_dup
    extract_secret_leaves!(updated, [])
    self.configs = updated
  end

  def extract_secret_leaves!(hash, path)
    hash.keys.each do |key| # rubocop:disable Style/HashEachMethods -- hash is mutated while iterating
      value = hash[key]
      current = path + [key.to_s]
      if value.is_a?(Hash)
        extract_secret_leaves!(value, current)
      elsif SECRET_CONFIG_KEYS.include?(key.to_s) && value.is_a?(String) && value.present?
        store_secret(current.join('.'), value) unless value == SECRET_PLACEHOLDER
        hash.delete(key)
      end
    end
  end

  def store_secret(key, value)
    record = matrice_secrets.detect { |secret| secret.key == key } || matrice_secrets.build(key: key)
    record.secret = value
  end

  def mask_secret_leaves!(hash)
    hash.each do |key, value|
      if value.is_a?(Hash)
        mask_secret_leaves!(value)
      elsif SECRET_CONFIG_KEYS.include?(key.to_s) && value.is_a?(String) && value.present?
        hash[key] = SECRET_PLACEHOLDER
      end
    end
  end

  def collect_secret_leaves(hash, path)
    hash.flat_map do |key, value|
      current = path + [key.to_s]
      if value.is_a?(Hash)
        collect_secret_leaves(value, current)
      elsif SECRET_CONFIG_KEYS.include?(key.to_s) && value.is_a?(String) && value.present? &&
            value != SECRET_PLACEHOLDER
        [current.join('.')]
      else
        []
      end
    end
  end

  def write_config_path(hash, dotted_key, value)
    *parents, leaf = dotted_key.split('.')
    target = parents.inject(hash) do |node, key|
      node[key].is_a?(Hash) ? node[key] : (node[key] = {})
    end
    target[leaf] = value
  end

  # Remove matrices with id > 31
  # @note: this is a temporary solution to remove invalid matrices
  def clean_invalid_ids
    self.class.where('id > 31').find_each(&:really_destroy!)
  end
end
