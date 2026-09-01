# frozen_string_literal: true

require 'rails_helper'

RSpec.describe TenantSetting do
  describe 'whitelist enforcement (REQ-ELN-7)' do
    it 'accepts only the delegated sections' do
      expect(described_class.new(section: 'ui_components', key: 'weighing_tasks', value: true)).to be_valid
      expect(described_class.new(section: 'devise', key: 'stretches', value: 12)).not_to be_valid
      expect(described_class.new(section: 'storage', key: 'primary_store', value: 'x')).not_to be_valid
    end

    it 'raises on .write for a non-delegated section' do
      expect { described_class.write(section: 'devise', key: 'stretches', value: 12) }
        .to raise_error(ArgumentError, /not tenant-settable/)
    end

    it 'whitelists exactly the inventory §0 sections' do
      expect(described_class::SECTIONS).to match_array(
        %w[converter spectra indigo_service ketcher_service editors structure_editors scifinder_n
           inference smtp ui_components profile_default user_props radar datacollectors messaging
           datacite signup guests identity],
      )
    end
  end

  describe 'uniqueness' do
    it 'enforces one row per (section, key)' do
      described_class.create!(section: 'radar', key: 'url', value: 'https://radar.example')
      duplicate = described_class.new(section: 'radar', key: 'url', value: 'https://other.example')

      expect(duplicate).not_to be_valid
      expect(duplicate.errors[:key]).to be_present
    end
  end

  describe 'secret routing' do
    it 'rejects plaintext storage of secret-valued keys' do
      record = described_class.new(section: 'smtp', key: 'password', value: 'hunter2')

      expect(record).not_to be_valid
      expect(record.errors[:key].join).to include('encrypted')
    end

    it '.write routes secret keys to TenantSettingSecret' do
      result = described_class.write(section: 'radar', key: 'client_secret', value: 'oauth-secret')

      expect(result).to be_a(TenantSettingSecret)
      expect(described_class.where(section: 'radar')).to be_empty
      expect(TenantSettingSecret.find_by(section: 'radar', key: 'client_secret').secret).to eq('oauth-secret')
    end

    it '.write with nil removes a secret override' do
      described_class.write(section: 'radar', key: 'client_secret', value: 'oauth-secret')
      described_class.write(section: 'radar', key: 'client_secret', value: nil)

      expect(TenantSettingSecret.find_by(section: 'radar', key: 'client_secret')).to be_nil
    end
  end

  describe '.write' do
    it 'upserts and records the acting user' do
      user = create(:person)
      described_class.write(section: 'ui_components', key: 'weighing_tasks', value: true, updated_by: user)
      record = described_class.write(section: 'ui_components', key: 'weighing_tasks', value: false, updated_by: user)

      expect(described_class.where(section: 'ui_components', key: 'weighing_tasks').count).to eq(1)
      expect(record.value).to be(false)
      expect(record.updated_by).to eq(user.id)
    end

    it 'removes the override on nil so the resolver falls back to ENV/yml' do
      described_class.write(section: 'ui_components', key: 'weighing_tasks', value: true)
      described_class.write(section: 'ui_components', key: 'weighing_tasks', value: nil)

      expect(described_class.where(section: 'ui_components', key: 'weighing_tasks')).to be_empty
    end

    it 'busts the AppConfig cache on every write' do
      allow(AppConfig).to receive(:bust!)

      described_class.write(section: 'ui_components', key: 'weighing_tasks', value: true)

      expect(AppConfig).to have_received(:bust!).at_least(:once)
    end
  end
end
