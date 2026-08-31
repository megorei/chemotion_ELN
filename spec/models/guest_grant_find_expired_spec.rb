# frozen_string_literal: true

require 'rails_helper'

# P1 WP 05: lazy expiry observation — the expired counterpart of find_usable.
RSpec.describe GuestGrant, '.find_expired' do
  let(:owner) { create(:person) }

  it 'finds the grant that would have matched but is expired' do
    grant = create(:guest_grant, federated_id: 'idp.example#g', state: 'pending',
                                 expires_at: 1.day.ago, created_by: owner.id)
    expect(described_class.find_expired(federated_id: 'idp.example#g')).to eq(grant)
  end

  it 'ignores unexpired grants' do
    create(:guest_grant, federated_id: 'idp.example#g', state: 'pending',
                         expires_at: 1.day.from_now, created_by: owner.id)
    expect(described_class.find_expired(federated_id: 'idp.example#g')).to be_nil
  end

  it 'falls back to detached email invitations' do
    grant = create(:guest_grant, federated_id: nil, email: 'guest@example.org', state: 'pending',
                                 expires_at: 1.hour.ago, created_by: owner.id)
    expect(described_class.find_expired(federated_id: nil, email: 'Guest@Example.org')).to eq(grant)
  end

  it 'ignores revoked grants even when expired' do
    create(:guest_grant, federated_id: 'idp.example#g', state: 'revoked',
                         expires_at: 1.day.ago, created_by: owner.id)
    expect(described_class.find_expired(federated_id: 'idp.example#g')).to be_nil
  end
end
