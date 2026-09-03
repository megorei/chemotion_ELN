# frozen_string_literal: true

require 'rails_helper'

RSpec.describe MatriceSecret do
  let(:matrice) { create(:matrice) }

  describe 'encryption at rest (REQ-ELN-5)' do
    it 'stores the value encrypted and decrypts it transparently' do
      record = described_class.create!(matrice: matrice, key: 'client_secret', secret: 'super-secret-value')

      raw = described_class.connection.select_value(
        "SELECT secret FROM matrice_secrets WHERE id = #{record.id}",
      )
      expect(raw).not_to include('super-secret-value')
      expect(record.reload.secret).to eq('super-secret-value')
    end
  end

  describe 'validations' do
    it 'requires a key, unique per matrice' do
      described_class.create!(matrice: matrice, key: 'hmac_secret', secret: 'a')

      expect(described_class.new(matrice: matrice, secret: 'b')).not_to be_valid
      expect(described_class.new(matrice: matrice, key: 'hmac_secret', secret: 'b')).not_to be_valid
    end

    it 'is valid for a soft-deleted matrice' do
      matrice.destroy
      expect(described_class.new(matrice_id: matrice.id, key: 'hmac_secret', secret: 'a')).to be_valid
    end
  end

  describe 'unconfigured encryption guard' do
    it 'raises a clear error naming the ENV keys when encryption is not configured' do
      allow(described_class).to receive(:encryption_configured?).and_return(false)

      expect { described_class.create!(matrice: matrice, key: 'client_secret', secret: 'x') }
        .to raise_error(ActiveRecord::Encryption::Errors::Configuration, /ACTIVE_RECORD_ENCRYPTION_PRIMARY_KEY/)
    end
  end
end
