# frozen_string_literal: true

require 'rails_helper'

# REQ-ELN-6 (P0 WP 04): tenant-set IdP-attribute -> group rules.
RSpec.describe Usecases::Identity::SyncGroups do
  let(:memory_store) { ActiveSupport::Cache::MemoryStore.new }
  let(:user) { create(:person) }
  let!(:legacy_group) { create(:group, first_name: 'Complat Lab', last_name: 'uni') }

  before do
    allow(Rails).to receive(:cache).and_return(memory_store)
    AppConfig.reset_memo!
  end

  after { AppConfig.reset_memo! }

  def set_rules(rules)
    TenantSetting.write(section: 'identity', key: 'group_rules', value: rules)
    AppConfig.reset_memo!
  end

  def sync(attributes, for_user: user)
    described_class.execute!(user: for_user, attributes: attributes)
  end

  describe 'built-in default rule (no tenant rules configured)' do
    it 'maps the legacy entitlement format unchanged' do
      sync({ 'entitlements' => ['urn:x:group:uni:Complat Lab#idp'] })
      expect(user.reload.groups).to include(legacy_group)
    end

    it 'ignores non-matching entitlements' do
      sync({ 'entitlements' => ['urn:mace:something-else'] })
      expect(user.reload.groups).to be_empty
    end
  end

  describe 'tenant-configured rules' do
    let!(:staff_group) { create(:group, name_abbreviation: 'STF') }

    it 'assigns a static target group by name_abbreviation on match' do
      set_rules([{ 'source' => 'affiliation', 'match' => '\\Astaff@kit\\.edu\\z',
                   'group' => { 'name_abbreviation' => 'STF' } }])
      sync({ 'affiliation' => ['staff@kit.edu'] })
      expect(user.reload.groups).to contain_exactly(staff_group)
    end

    it 'reads isMemberOf as a source' do
      set_rules([{ 'source' => 'isMemberOf', 'match' => 'cn=chemists',
                   'group' => { 'name_abbreviation' => 'STF' } }])
      sync({ 'isMemberOf' => ['cn=chemists,ou=groups,dc=kit'] })
      expect(user.reload.groups).to contain_exactly(staff_group)
    end

    it 'REPLACES the built-in default rule (tenant takes control)' do
      set_rules([{ 'source' => 'affiliation', 'match' => 'staff',
                   'group' => { 'name_abbreviation' => 'STF' } }])
      sync({ 'entitlements' => ['urn:x:group:uni:Complat Lab#idp'] })
      expect(user.reload.groups).to be_empty
    end

    it 'supports the legacy dynamic capture format without a static target' do
      set_rules([{ 'source' => 'entitlements', 'match' => '(group:[^#]+)' }])
      sync({ 'entitlements' => ['urn:x:group:uni:Complat Lab#idp'] })
      expect(user.reload.groups).to include(legacy_group)
    end

    it 'skips malformed rules and bad regexes without failing the login' do
      set_rules([{ 'match' => 'no-source' },
                 { 'source' => 'affiliation', 'match' => '([unclosed' },
                 { 'source' => 'affiliation', 'match' => 'staff', 'group' => { 'name_abbreviation' => 'STF' } }])
      expect { sync({ 'affiliation' => ['staff@kit.edu'] }) }.not_to raise_error
      expect(user.reload.groups).to contain_exactly(staff_group)
    end

    it 'parses rules delivered as a JSON string (ENV fallback tier)' do
      allow(AppConfig).to receive(:get).and_call_original
      allow(AppConfig).to receive(:get).with(:identity, :group_rules).and_return(
        '[{"source":"affiliation","match":"staff","group":{"name_abbreviation":"STF"}}]',
      )
      sync({ 'affiliation' => ['staff@kit.edu'] })
      expect(user.reload.groups).to contain_exactly(staff_group)
    end
  end

  describe 'guards and semantics' do
    it 'never assigns groups to external guests' do
      guest = create(:person, external: true, federated_id: 'idp#g')
      sync({ 'entitlements' => ['urn:x:group:uni:Complat Lab#idp'] }, for_user: guest)
      expect(guest.reload.groups).to be_empty
    end

    it 'is additive-only: unmatched existing memberships stay' do
      other = create(:group, first_name: 'Other', last_name: 'uni')
      user.groups << other
      sync({ 'entitlements' => ['urn:x:group:uni:Complat Lab#idp'] })
      expect(user.reload.groups).to contain_exactly(other, legacy_group)
    end

    it 'is idempotent per membership and audits each NEW assignment once' do
      expect do
        sync({ 'entitlements' => ['urn:x:group:uni:Complat Lab#idp'] })
        sync({ 'entitlements' => ['urn:x:group:uni:Complat Lab#idp'] })
      end.to change { AuditEvent.where(action: 'identity.group_assigned').count }.by(1)
      expect(user.reload.groups.size).to eq(1)
    end
  end
end
