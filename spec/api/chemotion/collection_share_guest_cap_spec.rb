# frozen_string_literal: true

require 'rails_helper'

# P1 WP 06 (REQ-ELN-20c): the guest cap must hold on the GENERIC share
# endpoints too — guests are discoverable in the share autocomplete, so the
# invitations namespace is not the only door.
describe 'guest cap on generic collection share endpoints' do
  include_context 'api request authorization context'

  let(:user) { create(:person) } # collection owner, authorized requester
  let(:guest) { create(:person, external: true, federated_id: 'idp.example#g') }
  let(:local_peer) { create(:person) }
  let(:collection) { create(:collection, user: user) }
  let(:memory_store) { ActiveSupport::Cache::MemoryStore.new }

  before do
    allow(Rails).to receive(:cache).and_return(memory_store)
    AppConfig.reset_memo!
  end

  after { AppConfig.reset_memo! }

  def enable_escalation(max_level)
    TenantSetting.write(section: 'guests', key: 'write_escalation', value: 'true')
    TenantSetting.write(section: 'guests', key: 'max_permission_level', value: max_level.to_s)
    AppConfig.reset_memo!
  end

  describe 'POST /api/v1/collection_shares' do
    it 'refuses a write-level share to a guest while escalation is off and audits the refusal' do
      expect do
        post '/api/v1/collection_shares',
             params: { collection_id: collection.id, user_ids: [guest.id], permission_level: 1 }
      end.to change { AuditEvent.where(action: 'guest.escalation_denied').count }.by(1)
      expect(response).to have_http_status :forbidden
      expect(CollectionShare.where(shared_with_id: guest.id)).to be_empty
    end

    it 'allows a read-only share to a guest while escalation is off' do
      post '/api/v1/collection_shares',
           params: { collection_id: collection.id, user_ids: [guest.id], permission_level: 0 }
      expect(response).to have_http_status :success
      expect(CollectionShare.find_by(shared_with_id: guest.id).permission_level).to eq(0)
    end

    it 'allows up to the configured cap when escalation is on' do
      enable_escalation(2)
      post '/api/v1/collection_shares',
           params: { collection_id: collection.id, user_ids: [guest.id], permission_level: 2 }
      expect(response).to have_http_status :success
    end

    it 'still refuses above the configured cap when escalation is on' do
      enable_escalation(2)
      post '/api/v1/collection_shares',
           params: { collection_id: collection.id, user_ids: [guest.id], permission_level: 3 }
      expect(response).to have_http_status :forbidden
    end

    it 'leaves local recipients uncapped' do
      post '/api/v1/collection_shares',
           params: { collection_id: collection.id, user_ids: [local_peer.id], permission_level: 3 }
      expect(response).to have_http_status :success
    end

    it 'caps a mixed recipient list on the guest in it' do
      post '/api/v1/collection_shares',
           params: { collection_id: collection.id, user_ids: [local_peer.id, guest.id], permission_level: 1 }
      expect(response).to have_http_status :forbidden
      expect(CollectionShare.where(collection: collection)).to be_empty
    end
  end

  describe 'PUT /api/v1/collection_shares/:id' do
    let!(:share) do
      create(:collection_share, collection: collection, shared_with_id: guest.id, permission_level: 0)
    end

    it 'refuses raising a guest share above the cap' do
      put "/api/v1/collection_shares/#{share.id}", params: { id: share.id, permission_level: 2 }
      expect(response).to have_http_status :forbidden
      expect(share.reload.permission_level).to eq(0)
    end

    it 'allows raising within the cap when escalation is on' do
      enable_escalation(2)
      put "/api/v1/collection_shares/#{share.id}", params: { id: share.id, permission_level: 2 }
      expect(response).to have_http_status :ok
      expect(share.reload.permission_level).to eq(2)
    end

    it 'does not retro-block an untouched level (detail-level-only edit passes)' do
      share.update!(permission_level: 2) # minted while escalation was on
      put "/api/v1/collection_shares/#{share.id}", params: { id: share.id, sample_detail_level: 1 }
      expect(response).to have_http_status :ok
      expect(share.reload.permission_level).to eq(2)
    end
  end
end
