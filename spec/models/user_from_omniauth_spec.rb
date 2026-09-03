# frozen_string_literal: true

require 'rails_helper'

# P1 WP 01 (REQ-ELN-16): identifier-first identity matching for federated
# logins — federated_id -> providers uid -> email (bootstrap, then backfill).
RSpec.describe User, '.from_omniauth' do
  let(:params) do
    {
      email: 'guest@remote.edu',
      uid: 'uid-123',
      provider: 'shibboleth',
      federated_id: 'shibboleth#uid-123',
      first_name: 'Gill',
      last_name: 'Guest',
      groups: [],
    }
  end

  context 'when a user with the federated_id exists' do
    let!(:user) { create(:person, federated_id: 'shibboleth#uid-123', email: 'old-mail@remote.edu') }

    it 'returns that user even when the IdP email changed (no identity fork)' do
      found = described_class.from_omniauth(params)
      expect(found.id).to eq(user.id)
      expect(found.email).to eq('old-mail@remote.edu')
    end

    it 'records the provider uid' do
      expect(described_class.from_omniauth(params).reload.providers).to include('shibboleth' => 'uid-123')
    end
  end

  context 'when a user recorded the provider uid but has no federated_id yet' do
    let!(:user) { create(:person, providers: { 'shibboleth' => 'uid-123' }, email: 'changed@remote.edu') }

    it 'matches by provider uid before email and backfills the federated_id' do
      found = described_class.from_omniauth(params)
      expect(found.id).to eq(user.id)
      expect(found.reload.federated_id).to eq('shibboleth#uid-123')
    end
  end

  context 'when only the email matches (bootstrap)' do
    let!(:user) { create(:person, email: 'guest@remote.edu') }

    it 'matches by email and backfills the federated_id' do
      found = described_class.from_omniauth(params)
      expect(found.id).to eq(user.id)
      expect(found.reload.federated_id).to eq('shibboleth#uid-123')
    end

    it 'does not overwrite an already stored (different) federated_id' do
      user.update!(federated_id: 'orcid#0000-0001')
      found = described_class.from_omniauth(params.merge(federated_id: nil))
      expect(found.reload.federated_id).to eq('orcid#0000-0001')
    end
  end

  context 'when nobody matches' do
    it 'builds an unpersisted user (current registration flow)' do
      found = described_class.from_omniauth(params)
      expect(found).not_to be_persisted
      expect(found.email).to eq('guest@remote.edu')
    end
  end

  describe 'entitlement group auto-assignment' do
    # Moved to the request-time rules engine (REQ-ELN-6):
    # Usecases::Identity::SyncGroups, invoked from the OmniAuth callback.
    # The model deliberately no longer maps a groups param.
    let!(:group) { create(:group, first_name: 'Complat Lab', last_name: 'uni') }

    it 'ignores a legacy groups param (mapping lives in SyncGroups now)' do
      user = create(:person, email: 'guest@remote.edu')
      described_class.from_omniauth(params.merge(groups: ['group:uni:Complat Lab']))
      expect(user.reload.groups).to be_empty
    end
  end
end
