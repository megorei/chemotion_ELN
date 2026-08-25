# frozen_string_literal: true

require 'rails_helper'

# P1 WP 02 (REQ-ELN-17): sharing with externals via /collection_shares/invitations.
# rubocop:disable RSpec/NestedGroups -- the policy matrix (policy > endpoint > identity case) reads
# best in its natural nesting, same precedent as attachment_spec.
describe Chemotion::CollectionShareAPI do
  include_context 'api request authorization context'

  # Same minimal ENV sandbox as the omniauth controller spec (no climate_control).
  def with_env(vars)
    old = vars.keys.index_with { |key| ENV.fetch(key, nil) }
    vars.each { |key, value| value.nil? ? ENV.delete(key) : ENV[key] = value }
    yield
  ensure
    old.each { |key, value| value.nil? ? ENV.delete(key) : ENV[key] = value }
  end

  let(:user) { create(:person) }
  let(:collection) { create(:collection, user: user) }
  let(:base_params) { { collection_id: collection.id, identifier: 'idp.example#alice' } }

  describe 'POST /api/v1/collection_shares/invitations' do
    subject(:execute_request) do
      post '/api/v1/collection_shares/invitations', params: request_params, as: :json
    end

    let(:request_params) { base_params }

    context 'when inbound collaboration is off (default)' do
      it 'refuses the invitation' do
        expect { execute_request }.not_to change(GuestGrant, :count)
        expect(response).to have_http_status(:forbidden)
      end
    end

    context 'when the policy is federation' do
      around { |example| with_env('TENANT_INBOUND_COLLABORATION' => 'federation') { example.run } }

      it 'creates a pending grant carrying the share parameters', :aggregate_failures do
        request_params[:permission_level] = 0
        request_params[:sample_detail_level] = 2
        expect { execute_request }.to change(GuestGrant, :count).by(1)
        expect(response).to have_http_status(:created)

        grant = GuestGrant.order(:id).last
        expect(grant).to have_attributes(
          collection_id: collection.id, federated_id: 'idp.example#alice',
          state: 'pending', permission_level: 0, sample_detail_level: 2,
          created_by: user.id
        )
      end

      it 'refuses an email-only invitation (federated identifier required)' do
        request_params.delete(:identifier)
        request_params[:email] = 'alice@example.org'
        expect { execute_request }.not_to change(GuestGrant, :count)
        expect(response).to have_http_status(:unprocessable_entity)
      end

      it 'updates the existing grant on re-invite instead of stacking rows', :aggregate_failures do
        create(:guest_grant, collection: collection, federated_id: 'idp.example#alice', permission_level: 0)
        request_params[:expires_at] = 1.week.from_now.iso8601
        expect { execute_request }.not_to change(GuestGrant, :count)
        expect(GuestGrant.find_by(federated_id: 'idp.example#alice').expires_at).to be_present
      end

      it 'caps the permission level at the tenant guest maximum (default 0)' do
        request_params[:permission_level] = 1
        expect { execute_request }.not_to change(GuestGrant, :count)
        expect(response).to have_http_status(:forbidden)
      end

      it 'honors a raised TENANT_GUEST_MAX_PERMISSION_LEVEL' do
        with_env('TENANT_GUEST_MAX_PERMISSION_LEVEL' => '2') do
          request_params[:permission_level] = 2
          expect { execute_request }.to change(GuestGrant, :count).by(1)
        end
      end

      it 'never grants manage_shares or above to externals, whatever the ENV says' do
        with_env('TENANT_GUEST_MAX_PERMISSION_LEVEL' => '5') do
          request_params[:permission_level] = 4
          execute_request
          expect(response).to have_http_status(:forbidden)
        end
      end

      it 'refuses an identity belonging to a local (non-external) user' do
        local = create(:person, federated_id: 'idp.example#local-colleague')
        request_params[:identifier] = local.federated_id
        expect { execute_request }.not_to change(GuestGrant, :count)
        expect(response).to have_http_status(:unprocessable_entity)
      end

      it 'is 404 for a collection the caller does not administrate' do
        request_params[:collection_id] = create(:collection).id
        execute_request
        expect(response).to have_http_status(:not_found)
      end

      it 'records a guest.invited audit event' do
        expect { execute_request }.to change { AuditEvent.where(action: 'guest.invited').count }.by(1)
      end

      context 'when the identity is an already-provisioned guest' do
        let!(:guest) do
          create(:person, external: true, federated_id: 'idp.example#alice', email: 'alice@example.org')
        end

        it 'writes the CollectionShare directly and starts the grant active', :aggregate_failures do
          expect { execute_request }.to change(CollectionShare, :count).by(1)
          share = CollectionShare.find_by(collection: collection, shared_with_id: guest.id)
          expect(share).to be_present
          expect(GuestGrant.order(:id).last.state).to eq('active')
          expect(collection.reload.shared).to be(true)
        end
      end
    end

    context 'when the policy is open' do
      around { |example| with_env('TENANT_INBOUND_COLLABORATION' => 'open') { example.run } }

      it 'accepts an email-only invitation' do
        request_params.delete(:identifier)
        request_params[:email] = 'bob@example.org'
        expect { execute_request }.to change(GuestGrant, :count).by(1)
        expect(GuestGrant.order(:id).last).to have_attributes(federated_id: nil, email: 'bob@example.org')
      end
    end
  end

  describe 'GET /api/v1/collection_shares/invitations' do
    around { |example| with_env('TENANT_INBOUND_COLLABORATION' => 'federation') { example.run } }

    it 'lists the grants of an administrable collection' do
      create(:guest_grant, collection: collection, federated_id: 'idp#one')
      create(:guest_grant, collection: create(:collection), federated_id: 'idp#elsewhere')

      get '/api/v1/collection_shares/invitations', params: { collection_id: collection.id }

      expect(parsed_json_response['invitations'].pluck('federated_id')).to eq(['idp#one'])
    end

    it 'is 404 for a collection the caller does not administrate' do
      get '/api/v1/collection_shares/invitations', params: { collection_id: create(:collection).id }
      expect(response).to have_http_status(:not_found)
    end
  end

  describe 'DELETE /api/v1/collection_shares/invitations/:id' do
    around { |example| with_env('TENANT_INBOUND_COLLABORATION' => 'federation') { example.run } }

    let(:guest) { create(:person, external: true, federated_id: 'idp#gone', account_active: true) }
    let!(:grant) do
      create(:guest_grant, collection: collection, federated_id: guest.federated_id, state: 'active')
    end
    let!(:share) do
      CollectionShare.create!(collection: collection, shared_with_id: guest.id, permission_level: 0)
    end

    it 'revokes grant and share and closes the login door', :aggregate_failures do
      delete "/api/v1/collection_shares/invitations/#{grant.id}"

      expect(response).to have_http_status(:no_content)
      expect(grant.reload.state).to eq('revoked')
      expect(CollectionShare.where(id: share.id)).not_to exist
      expect(guest.reload.account_active).to be(false)
    end

    it 'is 404 for a grant on a collection the caller does not administrate' do
      foreign = create(:guest_grant, collection: create(:collection), federated_id: 'idp#foreign')
      delete "/api/v1/collection_shares/invitations/#{foreign.id}"
      expect(response).to have_http_status(:not_found)
    end
  end
end
# rubocop:enable RSpec/NestedGroups
