# frozen_string_literal: true

require 'rails_helper'

# P1 WP 03 (REQ-ELN-18): a guest session sees EXACTLY the shared collections
# at the granted levels and nothing else. A guest is the codebase's first
# zero-own-collections user — paths that assume "every user owns collections"
# (the locked 'All' set, current_user.collections.find, …) must degrade to
# 401/404, never 500, and never leak foreign content.
# rubocop:disable RSpec/DescribeClass -- spans the whole API surface
describe 'guest enforcement across the API surface' do
  include_context 'api request authorization context'

  let(:owner) { create(:person) }
  let(:shared_collection) { create(:collection, user: owner, label: 'SharedWithGuest') }
  let(:private_collection) { create(:collection, user: owner, label: 'OwnersPrivate') }
  let!(:shared_sample) { create(:sample, name: 'guest-visible', collections: [shared_collection]) }
  let!(:private_sample) { create(:sample, name: 'owner-only', collections: [private_collection]) }

  # The guest: external identity, ZERO own collections (provisioning
  # deliberately creates none - REQ-ELN-16).
  let(:user) { create(:person, external: true, federated_id: 'idp.example#guest') }

  before do
    CollectionShare.create!(
      collection: shared_collection, shared_with_id: user.id,
      permission_level: CollectionShare.permission_level(:read_elements),
      sample_detail_level: 10, reaction_detail_level: 10, wellplate_detail_level: 10,
      screen_detail_level: 10, element_detail_level: 10, researchplan_detail_level: 10,
      celllinesample_detail_level: 10, devicedescription_detail_level: 10,
      sequencebasedmacromoleculesample_detail_level: 10
    )
    shared_collection.update!(shared: true)
  end

  describe 'collection visibility' do
    it 'lists exactly the shared collection, not the foreign private one', :aggregate_failures do
      get '/api/v1/collections'

      expect(response).to have_http_status(:ok)
      expect(response.body).to include('SharedWithGuest')
      expect(response.body).not_to include('OwnersPrivate')
    end
  end

  describe 'element read scoping' do
    it 'serves the shared collection content' do
      get '/api/v1/samples', params: { collection_id: shared_collection.id }

      expect(response).to have_http_status(:ok)
      expect(parsed_json_response['samples'].pluck('id')).to include(shared_sample.id)
    end

    it 'does not leak the private collection content via collection_id', :aggregate_failures do
      get '/api/v1/samples', params: { collection_id: private_collection.id }

      expect(response.status).to be < 500
      ids = response.status == 200 ? parsed_json_response.fetch('samples', []).pluck('id') : []
      expect(ids).not_to include(private_sample.id)
    end

    it 'refuses direct access to a foreign element without a 500', :aggregate_failures do
      get "/api/v1/samples/#{private_sample.id}"

      expect(response.status).to be_between(401, 404)
      expect(response.body).not_to include('owner-only')
    end

    it 'serves the directly addressed shared element' do
      get "/api/v1/samples/#{shared_sample.id}"

      expect(response).to have_http_status(:ok)
    end
  end

  describe 'read-only enforcement at permission_level 0' do
    it 'denies updating a shared element', :aggregate_failures do
      put "/api/v1/samples/#{shared_sample.id}", params: { name: 'defaced' }, as: :json

      expect(response.status).to be_between(401, 403)
      expect(shared_sample.reload.name).to eq('guest-visible')
    end

    it 'denies creating an element in the shared collection', :aggregate_failures do
      post '/api/v1/samples', as: :json, params: {
        name: 'smuggled', collection_id: shared_collection.id, container: { name: 'new' }
      }

      expect(response.status).to be_between(400, 422)
      expect(response.status).not_to eq(500)
      expect(Sample.find_by(name: 'smuggled')).to be_nil
    end

    it 'denies deleting a shared element', :aggregate_failures do
      delete "/api/v1/samples/#{shared_sample.id}"

      expect(response.status).to be_between(401, 404)
      expect(Sample.exists?(shared_sample.id)).to be(true)
    end
  end

  describe 'no-500 sweep across the top-level namespaces' do
    # Param-validation replies (400/422) are acceptable denials here; the net
    # only pins "no server error and no foreign content" for a
    # zero-own-collections session.
    [
      '/api/v1/collections',
      '/api/v1/collections/locked',
      '/api/v1/samples',
      '/api/v1/reactions',
      '/api/v1/wellplates',
      '/api/v1/screens',
      '/api/v1/research_plans',
      '/api/v1/devices',
      '/api/v1/messages/list',
      '/api/v1/users/current',
      '/api/v1/inbox/unlinked_attachments',
      '/api/v1/admin/disk',
    ].each do |path|
      it "GET #{path} never answers 5xx or leaks", :aggregate_failures do
        get path

        expect(response.status).to be < 500
        expect(response.body).not_to include('OwnersPrivate')
        expect(response.body).not_to include('owner-only')
      end
    end
  end

  describe 'search scoping (usecases/search/shared_methods)' do
    let(:search_params) do
      {
        selection: { elementType: :samples, name: 'guest', search_by_method: 'substring' },
        collection_id: shared_collection.id,
      }
    end

    it 'finds shared content when searching the shared collection' do
      post '/api/v1/search/samples', params: search_params, as: :json

      expect(response).to have_http_status(:created) # Grape POST default
      expect(response.body).to include('guest-visible')
    end

    it 'yields nothing from the private collection, without a 500', :aggregate_failures do
      post '/api/v1/search/samples', params: {
        selection: { elementType: :samples, name: 'owner', search_by_method: 'substring' },
        collection_id: private_collection.id,
      }, as: :json

      expect(response.status).to be < 500
      expect(response.body).not_to include('owner-only')
    end
  end

  describe 'detail levels (share values honored for a zero-own-collections user)' do
    let(:low_detail_collection) { create(:collection, user: owner, label: 'LowDetail') }
    let!(:low_detail_sample) { create(:sample, name: 'barely-visible', collections: [low_detail_collection]) }

    before do
      CollectionShare.create!(
        collection: low_detail_collection, shared_with_id: user.id,
        permission_level: CollectionShare.permission_level(:read_elements),
        sample_detail_level: 0
      )
      low_detail_collection.update!(shared: true)
    end

    it 'anonymizes below-level fields at sample_detail_level 0', :aggregate_failures do
      get "/api/v1/samples/#{low_detail_sample.id}"

      expect(response).to have_http_status(:ok)
      sample = parsed_json_response['sample']
      expect(sample['is_restricted']).to be(true)
      expect(sample['molfile']).to eq('***') # anonymize_below: 1 masks, not omits
    end

    it 'serves full detail where the share grants level 10' do
      get "/api/v1/samples/#{shared_sample.id}"

      expect(parsed_json_response['sample']['is_restricted']).to be(false)
    end
  end

  describe 'JWT parity (login-branch seam)' do
    include_context 'api request jwt context'

    let(:jwt_user) { user }

    it 'scopes a JWT guest exactly like a session guest', :aggregate_failures do
      get '/api/v1/samples', params: { collection_id: shared_collection.id }, headers: jwt_request_header

      expect(response).to have_http_status(:ok)
      expect(parsed_json_response['samples'].pluck('id')).to include(shared_sample.id)

      get "/api/v1/samples/#{private_sample.id}", headers: jwt_request_header
      expect(response.status).to be_between(401, 404)
    end
  end
end
# rubocop:enable RSpec/DescribeClass
