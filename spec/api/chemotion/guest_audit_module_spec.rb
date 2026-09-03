# frozen_string_literal: true

require 'rails_helper'

# P1 WP 05 (REQ-ELN-20): central guest access auditing at the Grape root.
describe 'guest audit module' do
  include_context 'api request authorization context'

  let(:owner) { create(:person) }
  let(:collection) { create(:collection, user: owner) }

  context 'with a guest session' do
    let(:user) { create(:person, external: true, federated_id: 'idp.example#g') }

    before do
      create(:collection_share, collection: collection, shared_with_id: user.id, permission_level: 0)
    end

    it 'records one collection_opened per collection per window, not per element fetch' do
      expect do
        get '/api/v1/samples', params: { collection_id: collection.id }
        get '/api/v1/reactions', params: { collection_id: collection.id }
        get '/api/v1/samples', params: { collection_id: collection.id }
      end.to change { AuditEvent.where(action: 'guest.collection_opened').count }.by(1)

      event = AuditEvent.where(action: 'guest.collection_opened').order(:id).last
      expect(event.subject_type).to eq('Collection')
      expect(event.subject_id).to eq(collection.id)
      expect(event.metadata['federated_id']).to eq('idp.example#g')
      expect(event.metadata['guest']).to be true
    end

    it 'records a fresh event outside the dedupe window' do
      get '/api/v1/samples', params: { collection_id: collection.id }
      AuditEvent.where(action: 'guest.collection_opened')
                .update_all(created_at: 11.minutes.ago) # rubocop:disable Rails/SkipsModelValidations
      expect { get '/api/v1/samples', params: { collection_id: collection.id } }
        .to change { AuditEvent.where(action: 'guest.collection_opened').count }.by(1)
    end

    it 'records a successful write action' do
      expect do
        put '/api/v1/user_labels/save_label', params: { title: 'mine', color: '#fff', access_level: 0 }
      end.to change { AuditEvent.where(action: 'guest.write_action').count }.by(1)

      event = AuditEvent.where(action: 'guest.write_action').order(:id).last
      expect(event.metadata['outcome']).to eq('success')
      expect(event.metadata['method']).to eq('PUT')
    end

    it 'does not record a POST-as-query endpoint as a write action' do
      expect do
        post '/api/v1/permissions/status', params: { currentCollection: { id: collection.id } }
      end.not_to change(AuditEvent, :count)
    end

    it 'records a denied write action' do
      foreign_collection = create(:collection, user: owner)
      expect do
        post '/api/v1/collection_shares',
             params: { collection_id: foreign_collection.id, user_ids: [owner.id], permission_level: 0 }
      end.to change { AuditEvent.where(action: 'guest.write_action').count }.by(1)

      event = AuditEvent.where(action: 'guest.write_action').order(:id).last
      expect(event.metadata['outcome']).to eq('denied')
    end
  end

  context 'with a local session' do
    let(:user) { create(:person) }

    it 'records nothing for reads or writes' do
      expect do
        get '/api/v1/samples', params: { collection_id: create(:collection, user: user).id }
        put '/api/v1/user_labels/save_label', params: { title: 'mine', color: '#fff', access_level: 0 }
      end.not_to change(AuditEvent, :count)
    end
  end
end
