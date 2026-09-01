# frozen_string_literal: true

require 'rails_helper'

# P2 WP 01 (REQ-ELN-22): the URL-like provenance identifier.
RSpec.describe ProvenanceRef do
  around do |example|
    original = ENV.to_h.slice('INSTANCE_ID', 'TENANT_ID', 'PUBLIC_URL')
    ENV['INSTANCE_ID'] = 'fiz-prod'
    ENV['TENANT_ID'] = 'kit'
    TenantContext.reset!
    example.run
  ensure
    original.each { |key, value| ENV[key] = value }
    %w[INSTANCE_ID TENANT_ID PUBLIC_URL].each { |key| ENV.delete(key) unless original.key?(key) }
    TenantContext.reset!
  end

  let(:sample) { create(:sample) }

  it 'builds the documented format from a record and the tenant context' do
    ref = described_class.build(sample, ts: Time.utc(2026, 9, 1, 12, 0))
    expect(ref.to_s).to eq("chemotion://fiz-prod/kit/Sample/#{sample.id}@2026-09-01T12:00:00Z")
  end

  it 'round-trips through parse' do
    ref = described_class.build(sample)
    parsed = described_class.parse(ref.to_s)
    expect(parsed).to eq(ref)
    expect(parsed.element_type).to eq('Sample')
    expect(parsed.id).to eq(sample.id)
    expect(parsed.tenant).to eq('kit')
  end

  it 'parses refs without a timestamp' do
    parsed = described_class.parse('chemotion://fiz-prod/kit/Sample/42')
    expect(parsed.ts).to be_nil
    expect(parsed.id).to eq(42)
  end

  it 'rejects foreign schemes and malformed refs' do
    expect { described_class.parse('https://kit.example/sample/1') }
      .to raise_error(described_class::ParseError)
    expect { described_class.parse('chemotion://only-instance') }
      .to raise_error(described_class::ParseError)
  end

  describe '#local?' do
    it 'is true for a ref from this instance and tenant' do
      expect(described_class.build(sample).local?).to be true
    end

    it 'is false for another tenant on the same instance' do
      foreign = described_class.parse("chemotion://fiz-prod/aachen/Sample/#{sample.id}")
      expect(foreign.local?).to be false
    end

    it 'is false for another instance' do
      foreign = described_class.parse("chemotion://other-host/kit/Sample/#{sample.id}")
      expect(foreign.local?).to be false
    end
  end
end
