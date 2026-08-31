# frozen_string_literal: true

require 'rails_helper'

# P1 WP 05 (REQ-ELN-20): grant-level changes on guest shares are audited.
describe 'guest grant level change audit' do
  include_context 'api request authorization context'

  let(:user) { create(:person) } # owner
  let(:guest) { create(:person, external: true, federated_id: 'idp.example#g') }
  let(:local_peer) { create(:person) }
  let(:collection) { create(:collection, user: user) }
  let(:memory_store) { ActiveSupport::Cache::MemoryStore.new }

  before do
    allow(Rails).to receive(:cache).and_return(memory_store)
    TenantSetting.write(section: 'guests', key: 'write_escalation', value: 'true')
    TenantSetting.write(section: 'guests', key: 'max_permission_level', value: '2')
    AppConfig.reset_memo!
  end

  after { AppConfig.reset_memo! }

  it 'audits raising an external share level with from/to' do
    share = create(:collection_share, collection: collection, shared_with_id: guest.id, permission_level: 0)
    expect do
      put "/api/v1/collection_shares/#{share.id}", params: { id: share.id, permission_level: 1 }
    end.to change { AuditEvent.where(action: 'guest.level_changed').count }.by(1)

    event = AuditEvent.where(action: 'guest.level_changed').order(:id).last
    expect(event.metadata).to include('from_level' => 0, 'to_level' => 1, 'recipient_id' => guest.id)
  end

  it 'does not audit an unchanged level' do
    share = create(:collection_share, collection: collection, shared_with_id: guest.id, permission_level: 1)
    expect do
      put "/api/v1/collection_shares/#{share.id}", params: { id: share.id, permission_level: 1 }
    end.not_to change { AuditEvent.where(action: 'guest.level_changed').count }
  end

  it 'does not audit level changes for local recipients' do
    share = create(:collection_share, collection: collection, shared_with_id: local_peer.id, permission_level: 0)
    expect do
      put "/api/v1/collection_shares/#{share.id}", params: { id: share.id, permission_level: 2 }
    end.not_to change { AuditEvent.where(action: 'guest.level_changed').count }
  end
end
