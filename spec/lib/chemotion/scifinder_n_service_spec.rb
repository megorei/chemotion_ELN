# frozen_string_literal: true

require 'rails_helper'

RSpec.describe Chemotion::ScifinderNService do
  describe 'when the provider is not configured (REQ-ELN-28)' do
    before do
      sfn_config = ActiveSupport::OrderedOptions.new
      allow(Rails.configuration).to receive(:sfn_config).and_return(sfn_config)
    end

    it 'returns an errors payload for provider_search' do
      result = described_class.provider_search('substances', 'CCO', 'x-smiles', 'token')
      expect(result).to eq(errors: [described_class::NOT_CONFIGURED_MESSAGE])
    end

    it 'raises a clear error for provider_access' do
      expect { described_class.provider_access('token') }
        .to raise_error(StandardError, described_class::NOT_CONFIGURED_MESSAGE)
    end

    it 'raises a clear error for provider_authorize' do
      expect { described_class.provider_authorize('code', 'verifier') }
        .to raise_error(StandardError, described_class::NOT_CONFIGURED_MESSAGE)
    end

    it 'is a no-op for provider_builder' do
      expect(described_class.provider_builder).to be_nil
    end
  end
end
