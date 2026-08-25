# frozen_string_literal: true

require 'rails_helper'

RSpec.describe Usecases::Guests::RedeemGrants do
  let(:guest) { create(:person, external: true, federated_id: 'idp#redeem', email: 'redeem@example.org') }
  let(:collection) { create(:collection) }

  describe '.execute!' do
    it 'converts a pending grant into a CollectionShare with the carried parameters', :aggregate_failures do
      grant = create(:guest_grant, federated_id: guest.federated_id, collection: collection,
                                   permission_level: 1, sample_detail_level: 2)

      converted = described_class.execute!(user: guest)

      expect(converted).to eq([grant])
      share = CollectionShare.find_by(collection: collection, shared_with_id: guest.id)
      expect(share).to have_attributes(permission_level: 1, sample_detail_level: 2)
      expect(collection.reload.shared).to be(true)
      expect(grant.reload.state).to eq('active')
    end

    it 'attaches and converts a detached email invitation issued before first login', :aggregate_failures do
      grant = create(:guest_grant, federated_id: nil, email: guest.email, collection: collection)

      described_class.execute!(user: guest)

      expect(grant.reload.federated_id).to eq(guest.federated_id)
      expect(grant.state).to eq('active')
      expect(CollectionShare.where(collection: collection, shared_with_id: guest.id)).to exist
    end

    it 'is idempotent: an existing share is left untouched on re-login' do
      create(:guest_grant, federated_id: guest.federated_id, collection: collection, permission_level: 0)
      described_class.execute!(user: guest)
      # The owner raises the share level after conversion …
      CollectionShare.find_by(collection: collection, shared_with_id: guest.id).update!(permission_level: 3)

      converted = described_class.execute!(user: guest)

      expect(converted).to be_empty
      expect(CollectionShare.find_by(collection: collection, shared_with_id: guest.id).permission_level).to eq(3)
    end

    it 'ignores expired invitations' do
      create(:guest_grant, federated_id: guest.federated_id, collection: collection, expires_at: 1.hour.ago)

      expect(described_class.execute!(user: guest)).to be_empty
      expect(CollectionShare.where(collection: collection, shared_with_id: guest.id)).not_to exist
    end

    it 'activates a pure login-ticket grant (no collection) without minting a share' do
      grant = create(:guest_grant, federated_id: guest.federated_id, collection: nil)

      converted = described_class.execute!(user: guest)

      expect(converted).to be_empty
      expect(grant.reload.state).to eq('active')
      expect(CollectionShare.where(shared_with_id: guest.id)).not_to exist
    end

    it 'records a guest.grants_redeemed audit event for conversions' do
      create(:guest_grant, federated_id: guest.federated_id, collection: collection)

      expect { described_class.execute!(user: guest) }
        .to change { AuditEvent.where(action: 'guest.grants_redeemed').count }.by(1)
    end
  end

  describe 'guest containment (REQ-ELN-16/17)' do
    # Guests are never group members, so the shared_with authorization scope
    # ([user.id, *group_ids]) must resolve to exactly their direct shares —
    # group shares and unrelated collections stay invisible.
    it 'a guest sees exactly the collections shared with them', :aggregate_failures do
      shared_collection = collection
      create(:collection) # unrelated
      group = create(:group, users: [create(:person)])
      group_collection = create(:collection)
      CollectionShare.create!(collection: group_collection, shared_with_id: group.id, permission_level: 1)

      create(:guest_grant, federated_id: guest.federated_id, collection: shared_collection)
      described_class.execute!(user: guest)

      expect(guest.group_ids).to be_empty
      expect(CollectionShare.shared_with(guest).pluck(:collection_id)).to contain_exactly(shared_collection.id)
    end
  end
end
