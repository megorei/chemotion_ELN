# frozen_string_literal: true

require 'rails_helper'

RSpec.describe Macromolecule, type: :model do
  it_behaves_like 'acts_as_paranoid soft-deletable model'

  it { is_expected.to have_many(:macromolecule_samples) }
  it { is_expected.to have_many(:collections).through(:macromolecule_samples) }

  describe 'creation' do
    let(:macromolecule) { create(:macromolecule) }

    it 'is possible to create a valid macromolecule' do
      expect(macromolecule.valid?).to be(true)
    end
  end
end
