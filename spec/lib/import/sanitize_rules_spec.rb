# frozen_string_literal: true

require 'rails_helper'

# P2 WP 01: the import-side sanitation contract (pure, no DB).
RSpec.describe Import::SanitizeRules do
  it 'neutralizes ancestry instead of deleting the key (importers fetch it)' do
    cleaned = described_class.sanitize!('Sample', { 'ancestry' => 'uuid-a/uuid-b', 'name' => 'x' })
    expect(cleaned).to have_key('ancestry')
    expect(cleaned['ancestry']).to be_nil
    expect(cleaned['name']).to eq('x')
  end

  it 'strips logidze history — the copy starts fresh' do
    cleaned = described_class.sanitize!('Reaction', { 'log_data' => { 'v' => 1 }, 'name' => 'r' })
    expect(cleaned).not_to have_key('log_data')
  end

  it 'drops the Attachment version column (its ancestry lives there)' do
    cleaned = described_class.sanitize!('Attachment', { 'version' => 'uuid-parent', 'filename' => 'f' })
    expect(cleaned).not_to have_key('version')
  end

  it 'keeps version on non-attachment rows' do
    cleaned = described_class.sanitize!('Sample', { 'version' => 3 })
    expect(cleaned['version']).to eq(3)
  end

  it 'refuses a row with non-nil deleted_at as tampered payload' do
    expect { described_class.sanitize!('Sample', { 'deleted_at' => '2026-01-01T00:00:00Z' }) }
      .to raise_error(described_class::DeletedSourceError, /tampered/)
  end

  it 'passes nil deleted_at through untouched' do
    cleaned = described_class.sanitize!('Sample', { 'deleted_at' => nil, 'name' => 'ok' })
    expect(cleaned['name']).to eq('ok')
  end
end
