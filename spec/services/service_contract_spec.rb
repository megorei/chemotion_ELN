# frozen_string_literal: true

require 'rails_helper'

# P0 WP 04: version/contract gating for shared services.
RSpec.describe ServiceContract do
  let(:memory_store) { ActiveSupport::Cache::MemoryStore.new }

  before do
    allow(Rails).to receive(:cache).and_return(memory_store)
    AppConfig.reset_memo!
  end

  after { AppConfig.reset_memo! }

  def set(section, key, value)
    TenantSetting.write(section: section, key: key, value: value)
    AppConfig.reset_memo!
  end

  describe '.check_indigo' do
    before do
      set('indigo_service', 'indigo_service_url', 'http://indigo.example/')
      set('indigo_service', 'expected_version', '1.35.0-rc.2')
    end

    it 'is ok when the served version matches the pin' do
      stub_request(:get, 'http://indigo.example/v2/indigo/info')
        .to_return(status: 200, body: { Indigo: { version: '1.35.0-rc.2' } }.to_json)
      expect(described_class.check(:indigo)).to include(ok: true, version: '1.35.0-rc.2')
    end

    it 'flags and audits a version mismatch' do
      stub_request(:get, 'http://indigo.example/v2/indigo/info')
        .to_return(status: 200, body: { Indigo: { version: '2.0.0' } }.to_json)
      result = nil
      expect { result = described_class.check(:indigo) }
        .to change { AuditEvent.where(action: 'config.service_version_mismatch').count }.by(1)
      expect(result).to include(ok: false, version: '2.0.0', expected: '1.35.0-rc.2')
    end

    it 'tolerates a v-prefix difference' do
      set('indigo_service', 'expected_version', 'v1.35.0-rc.2')
      stub_request(:get, 'http://indigo.example/v2/indigo/info')
        .to_return(status: 200, body: { Indigo: { version: '1.35.0-rc.2' } }.to_json)
      expect(described_class.check(:indigo)).to include(ok: true)
    end

    it 'reports unreachable as a controlled failure' do
      stub_request(:get, 'http://indigo.example/v2/indigo/info').to_timeout
      expect(described_class.check(:indigo)).to include(ok: false, reachable: false)
    end

    it 'is unknown without a pin' do
      # nil would only remove the DB override and fall back to the yml pin —
      # an empty override is how a tenant disables the check
      set('indigo_service', 'expected_version', '')
      stub_request(:get, 'http://indigo.example/v2/indigo/info')
        .to_return(status: 200, body: { Indigo: { version: '9.9' } }.to_json)
      expect(described_class.check(:indigo)).to include(ok: :unknown)
    end
  end

  describe '.check_converter (no version endpoint — reachability only)' do
    it 'is unknown-but-reachable when the endpoint answers' do
      set('converter', 'url', 'http://converter.example/')
      stub_request(:get, 'http://converter.example/').to_return(status: 401)
      expect(described_class.check(:converter)).to include(ok: :unknown, reachable: true)
    end

    it 'fails controlled when unreachable' do
      set('converter', 'url', 'http://converter.example/')
      stub_request(:get, 'http://converter.example/').to_timeout
      expect(described_class.check(:converter)).to include(ok: false, reachable: false)
    end

    it 'is unconfigured without a url' do
      expect(described_class.check(:converter)).to include(configured: false, ok: :unknown)
    end
  end

  describe '.check_all' do
    it 'returns one uniform result per service' do
      results = described_class.check_all
      expect(results.map { |r| r[:service] }).to contain_exactly(:converter, :spectra, :indigo, :ketcher)
      expect(results).to all(include(:configured, :reachable, :version, :expected, :ok))
    end
  end
end
