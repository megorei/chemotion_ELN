# frozen_string_literal: true

require 'rails_helper'

# P1 WP 06 (REQ-ELN-20c): redemption re-clamps to the policy of that moment —
# a grant minted while escalation was on must not redeem above today's cap.
RSpec.describe Usecases::Guests::RedeemGrants do
  let(:memory_store) { ActiveSupport::Cache::MemoryStore.new }
  let(:owner) { create(:person) }
  let(:guest) { create(:person, external: true, federated_id: 'idp.example#g') }
  let(:collection) { create(:collection, user: owner) }
  let!(:grant) do
    create(:guest_grant, collection_id: collection.id, federated_id: guest.federated_id,
                         permission_level: 2, state: 'pending', created_by: owner.id)
  end

  before do
    allow(Rails).to receive(:cache).and_return(memory_store)
    AppConfig.reset_memo!
  end

  after { AppConfig.reset_memo! }

  it 'clamps the minted share to the current cap and audits the clamp (escalation off)' do
    expect { described_class.execute!(user: guest) }
      .to change { AuditEvent.where(action: 'guest.escalation_denied').count }.by(1)
    share = CollectionShare.find_by(collection: collection, shared_with_id: guest.id)
    expect(share.permission_level).to eq(0)
  end

  it 'redeems at the granted level when the policy allows it' do
    TenantSetting.write(section: 'guests', key: 'write_escalation', value: 'true')
    TenantSetting.write(section: 'guests', key: 'max_permission_level', value: '2')
    AppConfig.reset_memo!

    described_class.execute!(user: guest)
    share = CollectionShare.find_by(collection: collection, shared_with_id: guest.id)
    expect(share.permission_level).to eq(2)
  end
end
