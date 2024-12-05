# frozen_string_literal: true

require 'rails_helper'

RSpec.describe MacromoleculeSample, type: :model do
  it { is_expected.to have_many(:collections_macromolecule_samples).dependent(:destroy) }
  it { is_expected.to have_many(:collections).through(:collections_macromolecule_samples) }
  it { is_expected.to belong_to(:macromolecule) }

  describe 'creation' do
    let(:macromolecule_sample) { create(:macromolecule_sample, macromolecule: create(:macromolecule)) }

    it 'is possible to create a valid macromolecule sample' do
      expect(macromolecule_sample.valid?).to be(true)
    end
  end
end
