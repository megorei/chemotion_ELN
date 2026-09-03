# frozen_string_literal: true

require 'rails_helper'

RSpec.describe Entities::MatriceEntity do
  describe '.represent' do
    subject(:serialized) { described_class.represent(matrice).serializable_hash }

    let(:matrice) do
      create(
        :matrice,
        configs: {
          'github' => { 'enable' => true, 'client_id' => 'public-id', 'client_secret' => 'very-secret-value' },
          'hmac_secret' => 'another-secret-value',
        },
      )
    end

    it 'exposes the non-secret config values' do
      expect(serialized[:configs]['github']['client_id']).to eq('public-id')
      expect(serialized[:configs]['github']['enable']).to be(true)
    end

    it 'replaces stored secrets with the masked placeholder' do
      expect(serialized[:configs]['github']['client_secret']).to eq(Matrice::SECRET_PLACEHOLDER)
      expect(serialized[:configs]['hmac_secret']).to eq(Matrice::SECRET_PLACEHOLDER)
    end

    it 'never contains a secret value anywhere in the serialization' do
      expect(serialized.to_json).not_to include('very-secret-value', 'another-secret-value')
    end

    context 'with unmigrated plaintext secrets still in the JSONB' do
      before do
        # bypass extraction: simulate a pre-WP-05 row
        matrice.update_columns( # rubocop:disable Rails/SkipsModelValidations
          configs: { 'openid_connect' => { 'client_secret' => 'legacy-plaintext' } },
        )
      end

      it 'masks residual plaintext secrets too' do
        expect(serialized[:configs]['openid_connect']['client_secret']).to eq(Matrice::SECRET_PLACEHOLDER)
        expect(serialized.to_json).not_to include('legacy-plaintext')
      end
    end
  end
end
