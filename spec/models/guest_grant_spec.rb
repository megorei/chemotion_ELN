# frozen_string_literal: true

require 'rails_helper'

RSpec.describe GuestGrant do
  describe 'validations' do
    it 'is valid with a federated_id only' do
      expect(build(:guest_grant, federated_id: 'idp#abc', email: nil)).to be_valid
    end

    it 'is valid with an email only (invitation pre-dates first login)' do
      expect(build(:guest_grant, federated_id: nil, email: 'guest@remote.edu')).to be_valid
    end

    it 'is invalid without any identity' do
      expect(build(:guest_grant, federated_id: nil, email: nil)).not_to be_valid
    end

    it 'rejects unknown states' do
      expect(build(:guest_grant, state: 'bogus')).not_to be_valid
    end

    it 'downcases the email' do
      expect(create(:guest_grant, federated_id: nil, email: 'Guest@Remote.EDU').email).to eq('guest@remote.edu')
    end
  end

  describe '.usable / .find_usable' do
    let!(:pending_grant) { create(:guest_grant, federated_id: 'idp#one') }
    let!(:active_grant) { create(:guest_grant, federated_id: 'idp#two', state: 'active') }
    let!(:revoked_grant) { create(:guest_grant, federated_id: 'idp#three', state: 'revoked') }
    let!(:email_grant) { create(:guest_grant, federated_id: nil, email: 'invited@remote.edu') }

    it 'usable covers pending and active, not revoked' do
      expect(described_class.usable).to contain_exactly(pending_grant, active_grant, email_grant)
      expect(described_class.usable).not_to include(revoked_grant)
    end

    it 'finds by federated_id first' do
      expect(described_class.find_usable(federated_id: 'idp#one', email: 'invited@remote.edu'))
        .to eq(pending_grant)
    end

    it 'falls back to email (case-insensitive) for grants without a federated_id' do
      expect(described_class.find_usable(federated_id: 'idp#unknown', email: 'Invited@Remote.EDU'))
        .to eq(email_grant)
    end

    it 'does not match by email when the grant is already attached to another federated_id' do
      create(:guest_grant, federated_id: 'idp#other', email: 'taken@remote.edu')
      expect(described_class.find_usable(federated_id: 'idp#unknown', email: 'taken@remote.edu')).to be_nil
    end

    it 'never returns revoked grants' do
      expect(described_class.find_usable(federated_id: revoked_grant.federated_id, email: nil)).to be_nil
    end
  end

  describe '#attach! / #activate!' do
    it 'backfills federated_id and email on first login' do
      grant = create(:guest_grant, federated_id: nil, email: 'invited@remote.edu')
      grant.attach!(federated_id: 'idp#new', email: 'invited@remote.edu')
      grant.activate!
      expect(grant.reload).to have_attributes(federated_id: 'idp#new', email: 'invited@remote.edu', state: 'active')
    end

    it 'does not overwrite an existing federated_id' do
      grant = create(:guest_grant, federated_id: 'idp#kept', email: nil)
      grant.attach!(federated_id: 'idp#other', email: 'x@remote.edu')
      expect(grant.reload.federated_id).to eq('idp#kept')
    end
  end

  describe '#revoke!' do
    let(:guest) do
      create(:person, external: true, federated_id: 'idp#guest', account_active: true)
    end
    let!(:grant) { create(:guest_grant, federated_id: guest.federated_id, state: 'active') }

    it 'sets the state to revoked' do
      grant.revoke!
      expect(grant.reload.state).to eq('revoked')
    end

    it 'disables the guest account when no other usable grant remains' do
      grant.revoke!
      expect(guest.reload.account_active).to be(false)
      expect(guest.reload.active_for_authentication?).to be(false)
    end

    it 'keeps the guest active while another usable grant exists' do
      create(:guest_grant, federated_id: guest.federated_id, state: 'pending')
      grant.revoke!
      expect(guest.reload.account_active).to be(true)
    end

    it 'does not disable internal (non-external) users' do
      internal = create(:person, federated_id: 'idp#internal', account_active: true)
      internal_grant = create(:guest_grant, federated_id: internal.federated_id, state: 'active')
      internal_grant.revoke!
      expect(internal.reload.account_active).to be(true)
    end

    it 'records a guest.revoked audit event' do
      admin = create(:admin)
      expect { grant.revoke!(by: admin) }
        .to change { AuditEvent.where(action: 'guest.revoked').count }.by(1)
      event = AuditEvent.order(:id).last
      expect(event.actor_id).to eq(admin.id)
      expect(event.metadata['federated_id']).to eq('idp#guest')
    end

    context 'with a converted collection share (WP 02)' do
      let(:collection) { create(:collection, shared: true) }
      let(:grant) do
        create(:guest_grant, federated_id: guest.federated_id, state: 'active', collection: collection)
      end

      before do
        CollectionShare.create!(collection: collection, shared_with_id: guest.id, permission_level: 0)
      end

      it 'destroys the converted share and refreshes the shared flag' do
        expect { grant.revoke! }
          .to change { CollectionShare.where(collection: collection, shared_with_id: guest.id).count }
          .from(1).to(0)
        expect(collection.reload.shared).to be(false)
      end

      it 'leaves other recipients` shares on the collection untouched' do
        other = create(:person)
        CollectionShare.create!(collection: collection, shared_with_id: other.id, permission_level: 1)
        grant.revoke!
        expect(CollectionShare.where(collection: collection, shared_with_id: other.id)).to exist
        expect(collection.reload.shared).to be(true)
      end
    end
  end

  describe 'expiry (WP 02)' do
    it 'find_usable ignores an expired invitation' do
      create(:guest_grant, federated_id: 'idp#late', expires_at: 1.day.ago)
      expect(described_class.find_usable(federated_id: 'idp#late')).to be_nil
    end

    it 'find_usable returns a not-yet-expired invitation' do
      grant = create(:guest_grant, federated_id: 'idp#in-time', expires_at: 1.day.from_now)
      expect(described_class.find_usable(federated_id: 'idp#in-time')).to eq(grant)
    end

    it 'expired? is false without expires_at' do
      expect(build(:guest_grant).expired?).to be(false)
    end
  end

  describe '.redeemable_for' do
    let(:guest) { create(:person, external: true, federated_id: 'idp#redeemer', email: 'redeemer@example.org') }

    it 'finds attached grants and detached email invitations, skipping expired and foreign ones',
       :aggregate_failures do
      attached = create(:guest_grant, federated_id: guest.federated_id)
      detached = create(:guest_grant, federated_id: nil, email: guest.email)
      create(:guest_grant, federated_id: guest.federated_id, expires_at: 1.hour.ago)
      create(:guest_grant, federated_id: 'idp#other')
      create(:guest_grant, federated_id: 'idp#other-2', email: guest.email)

      expect(described_class.redeemable_for(guest)).to contain_exactly(attached, detached)
    end
  end

  describe '#share_attributes' do
    it 'mirrors exactly the collection_shares parameter columns' do
      grant = build(:guest_grant, permission_level: 2, sample_detail_level: 3)
      expect(grant.share_attributes).to include(permission_level: 2, sample_detail_level: 3)
      expect(grant.share_attributes.keys).to match_array(described_class::SHARE_PARAM_COLUMNS)
    end
  end
end
