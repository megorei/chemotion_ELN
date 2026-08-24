# frozen_string_literal: true

require 'rails_helper'

describe UiComponents do
  describe '.enabled?' do
    def stub_config(value)
      allow(AppConfig).to receive(:get).with(:ui_components).and_return(value)
    end

    it 'is enabled when explicitly set to true' do
      stub_config(weighing_tasks: true)
      expect(described_class.enabled?(:weighing_tasks)).to be(true)
    end

    it 'is disabled when explicitly set to false' do
      stub_config(weighing_tasks: false)
      expect(described_class.enabled?(:weighing_tasks)).to be(false)
    end

    it 'is disabled (fail closed) when the component key is absent' do
      stub_config(other_component: true)
      expect(described_class.enabled?(:weighing_tasks)).to be(false)
    end

    it 'is disabled (fail closed) when no configuration is present' do
      stub_config(nil)
      expect(described_class.enabled?(:weighing_tasks)).to be(false)
    end

    it 'is disabled (fail closed) when the resolver raises' do
      allow(AppConfig).to receive(:get).and_raise(StandardError, 'resolver down')
      expect(described_class.enabled?(:weighing_tasks)).to be(false)
    end

    it 'accepts a string component name' do
      stub_config(weighing_tasks: true)
      expect(described_class.enabled?('weighing_tasks')).to be(true)
    end

    it 'resolves a tenant_settings override at request time (WP 03)' do
      TenantSetting.write(section: 'ui_components', key: 'weighing_tasks', value: true)
      expect(described_class.enabled?(:weighing_tasks)).to be(true)
    end
  end
end
