# frozen_string_literal: true

require 'rails_helper'

RSpec.describe CollectionsMacromoleculeSample, type: :model do
  it_behaves_like 'acts_as_paranoid soft-deletable model'

  it { is_expected.to belong_to(:collection) }
  it { is_expected.to belong_to(:macromolecule_sample) }

  describe 'creation' d
    let(:macromolecule_sample) { create(:macromolecule_sample, macromolecule: create(:macromolecule)) }
    let(:collection) { create(:collection) }
    let(:join_entry) do 
      described_class.create(
        collection: collection, 
        macromolecule_sample: macromolecule_sample
      )
    end

    it 'is possible to create a valid macromolecule sample' do
      expect(join_entry.valid?).to be(true)
    end
  end
end
