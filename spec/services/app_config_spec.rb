# frozen_string_literal: true

require 'rails_helper'

RSpec.describe AppConfig do
  let(:memory_store) { ActiveSupport::Cache::MemoryStore.new }

  before do
    allow(Rails).to receive(:cache).and_return(memory_store)
    described_class.reset_memo!
  end

  after do
    described_class.reset_memo!
    Chemotion::EnvConfig.reset!
  end

  # Blanks the yml layer for the radar section: a developer checkout may carry
  # a filled config/radar.yml (the radar controller specs need one with test
  # values), which would otherwise shadow the "unset optional setting" cases.
  def without_radar_yml_tier
    allow(Chemotion::EnvConfig).to receive(:layers).and_wrap_original do |original, name, **kwargs|
      layers = original.call(name, **kwargs)
      name.to_s == 'radar' ? layers.merge(yml: {}) : layers
    end
    described_class.reset_memo!
  end

  describe '.get precedence (REQ-ELN-31)' do
    it 'falls through to the WP 02 layers when the DB tier is empty' do
      expect(described_class.get(:converter, :timeout, env: {})).to eq(300) # structural default
    end

    it 'lets a DB tenant setting beat the structural default' do
      TenantSetting.write(section: 'converter', key: 'timeout', value: 60)

      expect(described_class.get(:converter, :timeout, env: {})).to eq(60)
    end

    it 'lets a DB tenant setting beat Default ENV' do
      TenantSetting.write(section: 'ketcher_service', key: 'url', value: 'http://tenant:1234/')

      env = { 'KETCHER_SERVICE_URL_DEFAULT' => 'http://operator/' }
      expect(described_class.get(:ketcher_service, :url, env: env)).to eq('http://tenant:1234/')
    end

    it 'lets Absolute ENV beat the DB tenant setting (REQ-ELN-8)' do
      TenantSetting.write(section: 'ketcher_service', key: 'url', value: 'http://tenant:1234/')

      env = { 'KETCHER_SERVICE_URL' => 'http://absolute/' }
      expect(described_class.get(:ketcher_service, :url, env: env)).to eq('http://absolute/')
    end

    it 'resolves nested DB keys through the dot-path convention' do
      TenantSetting.write(section: 'editors', key: 'docserver.callback_server', value: 'http://eln.example')

      expect(described_class.get(:editors, :docserver, :callback_server, env: {})).to eq('http://eln.example')
    end

    it 'tolerates unset optional settings as nil (REQ-ELN-28)' do
      # A developer checkout may carry a filled config/radar.yml (the radar
      # controller specs need one) — blank the yml tier so this example tests
      # the resolver, not the checkout.
      without_radar_yml_tier

      expect(described_class.get(:radar, :client_id, env: {})).to be_nil
      expect(described_class.get(:messaging, :enable, env: {})).to be_nil
    end

    it 'serves legacy single-ENV sections as the Default tier under a DB override' do
      env = { 'MESSAGE_IDLE_TIME' => '30' }
      expect(described_class.get(:messaging, :idle_time, env: env)).to eq('30')

      TenantSetting.write(section: 'messaging', key: 'idle_time', value: 42)

      expect(described_class.get(:messaging, :idle_time, env: env)).to eq(42)
    end
  end

  describe 'secret routing (REQ-ELN-5 pattern)' do
    it 'stores secret-valued keys encrypted and merges them back for server-side reads' do
      TenantSetting.write(section: 'smtp', key: 'password', value: 's3cret')

      row = TenantSettingSecret.find_by(section: 'smtp', key: 'password')
      expect(row.secret).to eq('s3cret')
      expect(row.ciphertext_for(:secret)).not_to include('s3cret')
      expect(described_class.get(:smtp, :password, env: {})).to eq('s3cret')
    end

    it 'never writes secret values into Rails.cache' do
      TenantSetting.write(section: 'smtp', key: 'password', value: 's3cret')

      described_class.get(:smtp, :password, env: {})
      described_class.get(:smtp) # warm the Rails.cache row entry too

      cached_rows = memory_store.read("app_config:db:smtp:v#{described_class.cache_version}")
      expect(cached_rows).to eq({})
    end
  end

  describe 'cache bust visibility (app + worker, REQ-ELN-31)' do
    it 'increments the shared version key on every tenant_settings write' do
      expect { TenantSetting.write(section: 'ui_components', key: 'probe_flag', value: 1) }
        .to change(described_class, :cache_version).by(1)
    end

    it 'makes a change visible to app and a fresh (worker) reader without restart' do
      TenantSetting.write(section: 'ui_components', key: 'probe_flag', value: 1)
      expect(described_class.get(:ui_components, :probe_flag)).to eq(1) # warm memo + Rails.cache

      TenantSetting.write(section: 'ui_components', key: 'probe_flag', value: 2)

      # same-process reader (app): the bust reset the memo
      expect(described_class.get(:ui_components, :probe_flag)).to eq(2)

      # simulated second process (delayed_job worker): no memo, shared cache store
      described_class.reset_memo!
      expect(described_class.get(:ui_components, :probe_flag)).to eq(2)
    end

    it 'keys Rails.cache entries by the version so stale entries are never reused' do
      TenantSetting.write(section: 'ui_components', key: 'probe_flag', value: 1)
      version1 = described_class.cache_version
      described_class.get(:ui_components)
      expect(memory_store.read("app_config:db:ui_components:v#{version1}")).to eq('probe_flag' => 1)

      TenantSetting.write(section: 'ui_components', key: 'probe_flag', value: 2)
      version2 = described_class.cache_version
      expect(version2).to be > version1

      described_class.get(:ui_components)
      expect(memory_store.read("app_config:db:ui_components:v#{version2}")).to eq('probe_flag' => 2)
    end

    it 'is read by a delayed_job worker at perform time (no boot snapshot)' do
      stub_const('AppConfigProbeJob', Class.new do
        def perform
          Rails.cache.write('app_config_spec:probe_result', AppConfig.get(:ui_components, :probe_flag))
        end
      end)

      TenantSetting.write(section: 'ui_components', key: 'probe_flag', value: 1)
      job = Delayed::Job.enqueue(AppConfigProbeJob.new)
      TenantSetting.write(section: 'ui_components', key: 'probe_flag', value: 2)

      job.invoke_job # the worker read path: deserialize + perform

      expect(memory_store.read('app_config_spec:probe_result')).to eq(2)
    end
  end

  describe '.effective (provenance for the WP 04 UI)' do
    it 'tags every key with its source and marks Absolute ENV read-only' do
      TenantSetting.write(section: 'converter', key: 'timeout', value: 60)

      env = { 'CONVERTER_PROFILE' => 'ops', 'CONVERTER_URL_DEFAULT' => 'http://operator/' }
      effective = described_class.effective(:converter, env: env)

      expect(effective['timeout']).to include(value: 60, source: 'db', read_only: false)
      expect(effective['profile']).to include(value: 'ops', source: 'env-absolute', read_only: true)
      expect(effective['url']).to include(value: 'http://operator/', source: 'env-default')
    end

    it 'tags unset optional keys with source nil' do
      without_radar_yml_tier # see the REQ-ELN-28 example: checkout-independence

      effective = described_class.effective(:radar, env: {})

      expect(effective['client_id']).to include(value: nil, source: 'nil')
    end

    it 'masks secret values with the placeholder' do
      TenantSetting.write(section: 'converter', key: 'secret_key', value: 'basic-auth-pw')

      effective = described_class.effective(:converter, env: {})

      expect(effective['secret_key']).to include(value: TenantSetting::SECRET_PLACEHOLDER,
                                                 source: 'db', secret: true)
      expect(effective.to_s).not_to include('basic-auth-pw')
    end

    it 'flags restart-required keys (REQ-ELN-9)' do
      effective = described_class.effective(:smtp, env: { 'SMTP_ADDRESS' => 'relay.example' })

      expect(effective['address']).to include(restart_required: true)
    end
  end

  describe '.restart_required?' do
    it 'covers whole boot-wired sections' do
      expect(described_class.restart_required?('smtp', 'address')).to be(true)
      expect(described_class.restart_required?(:scifinder_n, 'provider.host')).to be(true)
    end

    it 'covers single boot-wired keys inside request-capable sections' do
      expect(described_class.restart_required?('editors', 'docserver.uri')).to be(true)
      expect(described_class.restart_required?('editors', 'info.title')).to be(false)
    end

    it 'keeps request-time keys of partially boot-wired sections restart-free' do
      expect(described_class.restart_required?('signup', 'disabled')).to be(true)
      expect(described_class.restart_required?('signup', 'new_account_inactive')).to be(false)
    end

    it 'is false for fully request-time sections' do
      expect(described_class.restart_required?('ui_components', 'weighing_tasks')).to be(false)
    end
  end

  describe 'resilience' do
    it 'falls back to the ENV/yml tiers when the DB tier is unavailable' do
      allow(TenantSetting).to receive(:where).and_raise(ActiveRecord::StatementInvalid, 'no table')

      expect(described_class.get(:converter, :timeout, env: {})).to eq(300)
    end
  end
end
