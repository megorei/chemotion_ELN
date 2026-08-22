# frozen_string_literal: true

# == Schema Information
#
# Table name: matrices
#
#  id          :integer          not null, primary key
#  configs     :jsonb            not null
#  deleted_at  :datetime
#  enabled     :boolean          default(FALSE)
#  exclude_ids :integer          default([]), is an Array
#  include_ids :integer          default([]), is an Array
#  label       :string
#  name        :string           not null
#  created_at  :datetime
#  updated_at  :datetime
#
# Indexes
#
#  index_matrices_on_name  (name) UNIQUE
#
require 'rails_helper'

RSpec.describe Matrice do
  describe 'creation' do
    let(:matrice) { build(:matrice) }
    let(:matrice_disabled) { build(:matrice, :disabled, id: nil) }
    let(:matrice_enabled) { build(:matrice, :enabled, id: nil) }

    it 'is valid' do
      matrice.save!
      described_class.reset_sequence(52)
      matrice_enabled.save!
      expect(matrice).to be_valid
      expect(matrice.id).to be < 31
    end

    it 'remove out of range matrices' do
      described_class.reset_sequence
      matrice_disabled.save!
      matrice_disabled.update_column(:id, 355_555) # rubocop:disable Rails/SkipsModelValidations
      matrice_enabled.save!
      expect(matrice_enabled.id).to be < 31
      expect(described_class.where(name: matrice_disabled.name)).to be_empty
    end
  end

  describe 'secret extraction (WP 05, REQ-ELN-5)' do
    let(:configs) do
      {
        'github' => { 'enable' => true, 'client_id' => 'gh-id', 'client_secret' => 'gh-secret' },
        'hmac_secret' => 'hmac-plain',
        'receiving_secret' => '',
        'server' => 'https://compute.example',
      }
    end
    let(:matrice) { create(:matrice, configs: configs) }

    it 'moves secret-named leaves into the encrypted store on save' do
      expect(matrice.reload.configs).to eq(
        'github' => { 'enable' => true, 'client_id' => 'gh-id' },
        'receiving_secret' => '',
        'server' => 'https://compute.example',
      )
      expect(matrice.matrice_secrets.pluck(:key)).to contain_exactly('github.client_secret', 'hmac_secret')
    end

    it 'leaves blank placeholder values untouched in the JSONB' do
      expect(matrice.reload.configs['receiving_secret']).to eq('')
    end

    it 'merges decrypted secrets back via configs_with_secrets' do
      expect(matrice.reload.configs_with_secrets)
        .to eq(configs.except('receiving_secret').merge('receiving_secret' => ''))
    end

    it 'keeps the stored secret when the masked placeholder round-trips (write-only contract)' do
      matrice.update!(
        configs: matrice.reload.configs.deep_merge(
          'github' => { 'client_secret' => Matrice::SECRET_PLACEHOLDER },
        ),
      )

      expect(matrice.reload.configs.dig('github', 'client_secret')).to be_nil
      expect(matrice.configs_with_secrets.dig('github', 'client_secret')).to eq('gh-secret')
    end

    it 'replaces the stored secret when a new value is written' do
      matrice.update!(configs: matrice.reload.configs.deep_merge('github' => { 'client_secret' => 'gh-rotated' }))

      expect(matrice.reload.configs_with_secrets.dig('github', 'client_secret')).to eq('gh-rotated')
      expect(matrice.matrice_secrets.where(key: 'github.client_secret').count).to eq(1)
    end

    it 'masks stored and residual plaintext secrets in masked_configs', :aggregate_failures do
      matrice.update_column(:configs, matrice.configs.merge('cas_api_key' => 'residual-plain')) # rubocop:disable Rails/SkipsModelValidations

      masked = matrice.reload.masked_configs
      expect(masked.dig('github', 'client_secret')).to eq(Matrice::SECRET_PLACEHOLDER)
      expect(masked['hmac_secret']).to eq(Matrice::SECRET_PLACEHOLDER)
      expect(masked['cas_api_key']).to eq(Matrice::SECRET_PLACEHOLDER)
      expect(masked.to_json).not_to include('gh-secret', 'hmac-plain', 'residual-plain')
    end

    it 'reports plaintext secret paths for the migration task' do
      matrice.update_column(:configs, configs) # rubocop:disable Rails/SkipsModelValidations -- simulate unmigrated row

      expect(matrice.reload.plaintext_secret_paths).to contain_exactly('github.client_secret', 'hmac_secret')
    end
  end
end
