# frozen_string_literal: true

require 'rails_helper'

describe Chemotion::SearchAPI do
  context 'with authorized user' do
    let(:current_user) { create(:person) }
    let(:other_user) { create(:person) }

    let(:collection) { create(:collection, user: current_user) }
    let(:other_collection) { create(:collection, user: other_user) }
    let(:sample_a) { create(:sample, name: 'SampleA') }
    let(:sample_b) { create(:sample, name: 'SampleB') }
    let(:sample_c) { create(:sample, name: 'SampleC') }
    let(:sample_d) { create(:sample, name: 'SampleD') }
    let(:wellplate) { create(:wellplate, name: 'Wellplate', wells: [build(:well, sample: sample_a)]) }
    let(:other_wellplate) { create(:wellplate, name: 'Other Wellplate', wells: [build(:well, sample: sample_b)]) }
    let(:reaction) { create(:reaction, name: 'Reaction', samples: [sample_a, sample_b])}
    let(:other_reaction) { create(:reaction, name: 'Other Reaction', samples: [sample_c, sample_d]) }
    let(:screen) { create(:screen, name: 'Screen') }
    let(:other_screen) { create(:screen, name: 'Other Screen') }

    before do
      allow_any_instance_of(WardenAuthentication).to receive(:current_user).and_return(current_user)
      CollectionsReaction.create!(reaction: reaction, collection: collection)
      CollectionsSample.create!(sample: sample_a, collection: collection)
      CollectionsScreen.create!(screen: screen, collection: collection)
      CollectionsWellplate.create!(wellplate: wellplate, collection: collection)
      ScreensWellplate.create!(wellplate: wellplate, screen: screen)

      CollectionsReaction.create!(reaction: other_reaction, collection: other_collection)
      CollectionsSample.create!(sample: sample_b, collection: other_collection)
      CollectionsScreen.create!(screen: other_screen, collection: other_collection)
      CollectionsWellplate.create!(wellplate: other_wellplate, collection: other_collection)
      ScreensWellplate.create!(wellplate: other_wellplate, screen: other_screen)
    end

    context 'when requesting POST /api/v1/search/all' do
      let(:url) { '/api/v1/search/all' }

      context 'with a sample name from the correct collection' do
        let(:search_term) { 'SampleA' }
        let(:params) do
          {
            selection: {
              elementType: :all,
              name: search_term,
              search_by_method: :substring,
            },
            collection_id: collection.id
          }
        end

        it 'returns the sample and all other objects referencing the sample from the requested collection' do
          post url, params: params

          result = JSON.parse(response.body)

          expect(result.dig('reactions', 'totalElements')).to eq 1
          expect(result.dig('reactions', 'ids')).to eq [reaction.id]
          expect(result.dig('samples', 'totalElements')).to eq 1
          expect(result.dig('samples', 'ids')).to eq [sample_a.id]
          expect(result.dig('screens', 'totalElements')).to eq 1
          expect(result.dig('screens', 'ids')).to eq [screen.id]
          expect(result.dig('wellplates', 'totalElements')).to eq 1
          expect(result.dig('wellplates', 'ids')).to eq [wellplate.id]
        end
      end
    end

    context 'when requesting POST /api/v1/search/samples' do
      let(:url) { '/api/v1/search/samples' }

      context 'with a sample name from the correct collection' do
        let(:search_term) { 'SampleA' }
        let(:params) do
          {
            selection: {
              elementType: :samples,
              name: search_term,
              search_by_method: :substring,
            },
            collection_id: collection.id
          }
        end

        it 'returns the sample and all other objects referencing the sample from the requested collection' do
          post url, params: params

          result = JSON.parse(response.body)

          expect(result.dig('reactions', 'totalElements')).to eq 1
          expect(result.dig('reactions', 'ids')).to eq [reaction.id]
          expect(result.dig('samples', 'totalElements')).to eq 1
          expect(result.dig('samples', 'ids')).to eq [sample_a.id]
          expect(result.dig('screens', 'totalElements')).to eq 1
          expect(result.dig('screens', 'ids')).to eq [screen.id]
          expect(result.dig('wellplates', 'totalElements')).to eq 1
          expect(result.dig('wellplates', 'ids')).to eq [wellplate.id]
        end
      end
    end
  end
end