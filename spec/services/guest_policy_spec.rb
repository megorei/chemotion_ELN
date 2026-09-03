# frozen_string_literal: true

require 'rails_helper'

# P1 WP 06 (REQ-ELN-20c): the single guest write-escalation predicate.
RSpec.describe GuestPolicy do
  let(:memory_store) { ActiveSupport::Cache::MemoryStore.new }
  let(:guest) { create(:person, external: true, federated_id: 'idp.example#g') }
  let(:local) { create(:person) }

  before do
    allow(Rails).to receive(:cache).and_return(memory_store)
    AppConfig.reset_memo!
  end

  after { AppConfig.reset_memo! }

  def set_policy(key, value)
    TenantSetting.write(section: 'guests', key: key, value: value)
    AppConfig.reset_memo!
  end

  describe '.max_level_for' do
    it 'never caps a local user' do
      expect(described_class.max_level_for(local)).to be_nil
    end

    it 'caps a guest at read-only while the switch is off (default)' do
      expect(described_class.max_level_for(guest)).to eq(0)
    end

    it 'caps at the configured level when the switch is on' do
      set_policy('write_escalation', 'true')
      set_policy('max_permission_level', '2')
      expect(described_class.max_level_for(guest)).to eq(2)
    end

    it 'never exceeds the hard ceiling below manage_shares' do
      set_policy('write_escalation', 'true')
      set_policy('max_permission_level', '9')
      expect(described_class.max_level_for(guest))
        .to eq(TenantContext::GUEST_PERMISSION_HARD_CEILING)
    end

    it 'switch off beats a configured level (explicit off wins over legacy)' do
      set_policy('write_escalation', 'false')
      set_policy('max_permission_level', '2')
      expect(described_class.max_level_for(guest)).to eq(0)
    end

    context 'with a per-group restriction' do
      let(:group) { create(:group, guest_max_permission_level: 1) }

      before do
        set_policy('write_escalation', 'true')
        set_policy('max_permission_level', '3')
      end

      it 'the most restrictive grantor group cap wins' do
        grantor = create(:person)
        group.users << grantor
        expect(described_class.max_level_for(guest, grantor: grantor)).to eq(1)
      end

      it 'an explicit group argument restricts as well (P2 predicate form)' do
        expect(described_class.max_level_for(guest, group: group)).to eq(1)
      end

      it 'a group can restrict but never extend the tenant allowance' do
        set_policy('max_permission_level', '1')
        wide_group = create(:group, guest_max_permission_level: 3)
        expect(described_class.max_level_for(guest, group: wide_group)).to eq(1)
      end

      it 'a group without a cap inherits the tenant policy' do
        plain_group = create(:group)
        expect(described_class.max_level_for(guest, group: plain_group)).to eq(3)
      end
    end
  end

  describe 'legacy ENV compatibility' do
    it 'treats a positive legacy ENV cap with an unset switch as escalation on' do
      allow(AppConfig).to receive(:get).and_call_original
      allow(AppConfig).to receive(:get).with(:guests, :write_escalation).and_return('')
      allow(AppConfig).to receive(:get).with(:guests, :max_permission_level).and_return('2')
      expect(described_class.max_level_for(guest)).to eq(2)
    end
  end

  describe '.allows?' do
    it 'is true for locals at any level' do
      expect(described_class.allows?(local, 5)).to be true
    end

    it 'is false for a guest above the cap' do
      expect(described_class.allows?(guest, 1)).to be false
    end

    it 'is true for a guest at the cap' do
      expect(described_class.allows?(guest, 0)).to be true
    end
  end
end
