# frozen_string_literal: true

require 'rails_helper'

describe SequenceBasedMacromolecule do
  describe '.with_ec_number' do
    it "returns only SBMM records that have the matching ec number" do
      sbmm1 = create(:uniprot_sbmm, ec_numbers: ["1.2.3", "1.2.4"])
      sbmm2 = create(:uniprot_sbmm, ec_numbers: ["1.2.1", "1.2.4"])

      result = described_class.with_ec_number("1.2.3")

      expect(result.count).to eq 1
      expect(result.first.id).to be sbmm1.id
    end
  end

  describe '.search_in_name' do
    it 'finds the result in a case-insensitive way' do
      sbmm1 = create(:uniprot_sbmm, short_name: 'Insulin')
      sbmm2 = create(:uniprot_sbmm, short_name: 'Some insulin-producing Protein')
      sbmm3 = create(:uniprot_sbmm, short_name: 'Some other protein')

      result = described_class.search_in_name('insulin')

      expect(result.count).to eq 2
      expect(result.map(&:id).sort).to eq [sbmm1.id, sbmm2.id].sort
    end
  end
end
