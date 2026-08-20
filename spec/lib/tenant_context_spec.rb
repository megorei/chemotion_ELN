# frozen_string_literal: true

require 'rails_helper'

describe TenantContext do
  # Minimal ENV sandbox (no climate_control in the Gemfile): sets/deletes the
  # given keys, resets the memoized context, and restores everything afterwards.
  def with_env(vars)
    old = vars.keys.index_with { |key| ENV.fetch(key, nil) }
    vars.each { |key, value| value.nil? ? ENV.delete(key) : ENV[key] = value }
    described_class.reset!
    yield
  ensure
    old.each { |key, value| value.nil? ? ENV.delete(key) : ENV[key] = value }
    described_class.reset!
  end

  describe '.current' do
    context 'without TENANT_ID (single-tenant fallback)' do
      it 'returns a default context with a nil id' do
        with_env('TENANT_ID' => nil, 'TENANT_NAME' => nil, 'TENANT_DOMAIN' => nil) do
          expect(described_class.current.id).to be_nil
          expect(described_class.current).to be_default
        end
      end

      it 'is frozen' do
        with_env('TENANT_ID' => nil) do
          expect(described_class.current).to be_frozen
        end
      end

      it 'is memoized' do
        with_env('TENANT_ID' => nil) do
          expect(described_class.current).to equal(described_class.current)
        end
      end
    end

    context 'with TENANT_ID/TENANT_NAME/TENANT_DOMAIN' do
      it 'exposes the tenant identity from ENV', :aggregate_failures do
        with_env('TENANT_ID' => 'kit', 'TENANT_NAME' => 'KIT', 'TENANT_DOMAIN' => 'eln.kit.edu') do
          context = described_class.current
          expect(context.id).to eq('kit')
          expect(context.name).to eq('KIT')
          expect(context.domain).to eq('eln.kit.edu')
          expect(context).not_to be_default
          expect(context).to be_frozen
        end
      end

      it 'treats blank values as unset' do
        with_env('TENANT_ID' => '', 'TENANT_NAME' => '', 'TENANT_DOMAIN' => '') do
          expect(described_class.current).to be_default
        end
      end
    end
  end

  describe '.reset!' do
    it 'drops the memoized context so ENV is re-read' do
      with_env('TENANT_ID' => nil) do
        first = described_class.current
        ENV['TENANT_ID'] = 'kit'
        described_class.reset!
        expect(described_class.current).not_to equal(first)
        expect(described_class.current.id).to eq('kit')
      ensure
        ENV.delete('TENANT_ID')
      end
    end
  end

  describe '.multi_tenant?' do
    it 'is false when MULTI_TENANT is unset' do
      with_env('MULTI_TENANT' => nil) do
        expect(described_class).not_to be_multi_tenant
      end
    end

    it 'is true only for the literal string "true"' do
      with_env('MULTI_TENANT' => 'true') do
        expect(described_class).to be_multi_tenant
      end
      with_env('MULTI_TENANT' => '1') do
        expect(described_class).not_to be_multi_tenant
      end
    end
  end

  describe '#public_url / #root_uri' do
    it 'returns the raw PUBLIC_URL when set', :aggregate_failures do
      with_env('PUBLIC_URL' => 'https://my.eln.edu') do
        expect(described_class.current.public_url).to eq('https://my.eln.edu')
        expect(described_class.current.root_uri.host).to eq('my.eln.edu')
        expect(described_class.current.root_uri.scheme).to eq('https')
      end
    end

    it 'public_url is nil without PUBLIC_URL (call sites keep their own fallbacks)' do
      with_env('PUBLIC_URL' => nil) do
        expect(described_class.current.public_url).to be_nil
      end
    end

    it 'root_uri falls back to the historical default http://localhost:3000', :aggregate_failures do
      with_env('PUBLIC_URL' => nil) do
        uri = described_class.current.root_uri
        expect(uri.to_s).to eq('http://localhost:3000')
        expect(uri.host).to eq('localhost')
        expect(uri.port).to eq(3000)
      end
    end
  end

  describe '#application_title' do
    it 'falls back to Chemotion (historical default)' do
      with_env('APPLICATION_TITLE' => nil) do
        expect(described_class.current.application_title).to eq('Chemotion')
      end
      with_env('APPLICATION_TITLE' => '') do
        expect(described_class.current.application_title).to eq('Chemotion')
      end
    end

    it 'returns APPLICATION_TITLE when set' do
      with_env('APPLICATION_TITLE' => 'KIT ELN') do
        expect(described_class.current.application_title).to eq('KIT ELN')
      end
    end
  end

  describe 'boot validation (config/initializers/tenant_context.rb)' do
    let(:initializer) { Rails.root.join('config/initializers/tenant_context.rb').to_s }

    it 'fails fast when MULTI_TENANT=true but TENANT_ID is missing' do
      with_env('MULTI_TENANT' => 'true', 'TENANT_ID' => nil) do
        expect { load initializer }
          .to raise_error(TenantContext::MissingTenantError, /TENANT_ID is not set/)
      end
    end

    it 'boots with MULTI_TENANT=true and TENANT_ID set' do
      with_env('MULTI_TENANT' => 'true', 'TENANT_ID' => 'kit') do
        expect { load initializer }.not_to raise_error
      end
    end

    it 'boots silently without MULTI_TENANT (single-tenant deployments unaffected)' do
      with_env('MULTI_TENANT' => nil, 'TENANT_ID' => nil) do
        expect { load initializer }.not_to raise_error
      end
    end
  end

  describe 'delayed_job worker inheritance' do
    # bin/delayed_job requires config/environment (full Rails boot), so every
    # worker process runs config/initializers/tenant_context.rb and sees the
    # same memoized TenantContext as the web process. This example runs in the
    # same boot path (rails_helper -> config/environment) and asserts the
    # context is available after boot; plus a source-level guard on bin/delayed_job.
    it 'is available in any process booted via config/environment' do
      expect(Object.const_defined?(:TenantContext)).to be(true)
      expect(described_class.current).to be_frozen
    end

    it 'bin/delayed_job boots the full Rails environment (initializer path)' do
      expect(Rails.root.join('bin/delayed_job').read).to include("'config', 'environment'")
    end
  end
end
