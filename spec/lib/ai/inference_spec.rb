# frozen_string_literal: true

require 'rails_helper'

RSpec.describe Ai::Inference do
  describe 'when the inference service is not configured (REQ-ELN-28)' do
    before do
      config = ActiveSupport::OrderedOptions.new
      allow(Rails.configuration).to receive(:inference).and_return(config)
    end

    it 'returns the error payload for .products instead of raising' do
      expect(described_class.products(['CCO'])).to eq(described_class::NOT_CONFIGURED_BODY)
    end

    it 'returns the error payload for .reactants instead of raising' do
      expect(described_class.reactants(['CCO'])).to eq(described_class::NOT_CONFIGURED_BODY)
    end
  end
end
