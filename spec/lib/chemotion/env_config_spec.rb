# frozen_string_literal: true

require 'rails_helper'

RSpec.describe Chemotion::EnvConfig do
  after do
    described_class.reset!
  end

  describe 'PREFIX_MAP' do
    it 'covers every section of app_config.yml' do
      sections = YAML.safe_load_file(Rails.root.join('config/app_config.yml')).keys.map(&:to_sym)
      expect(described_class::PREFIX_MAP.keys).to match_array(sections)
    end

    it 'has unambiguous prefixes (no prefix is a prefix of another)' do
      prefixes = described_class::PREFIX_MAP.values.map { |p| "#{p}_" }
      prefixes.combination(2).each do |a, b|
        expect(a.start_with?(b)).to be(false), "#{b} is a prefix of #{a}"
        expect(b.start_with?(a)).to be(false), "#{a} is a prefix of #{b}"
      end
    end
  end

  describe '.section' do
    it 'returns the structural defaults when nothing is configured' do
      section = described_class.section(:converter, env: {})
      expect(section[:url]).to be_nil
      expect(section[:timeout]).to eq(300)
      expect(section[:ext]).to include('.txt')
    end

    it 'lets an Absolute ENV variable win over the structural default' do
      section = described_class.section(:converter, env: { 'CONVERTER_TIMEOUT' => '60' })
      expect(section[:timeout]).to eq(60)
    end

    it 'lets a Default ENV variable win over the structural default' do
      section = described_class.section(:converter, env: { 'CONVERTER_URL_DEFAULT' => 'http://conv:4000/' })
      expect(section[:url]).to eq('http://conv:4000/')
    end

    it 'lets Absolute ENV win over Default ENV' do
      env = { 'CONVERTER_URL' => 'http://abs/', 'CONVERTER_URL_DEFAULT' => 'http://def/' }
      expect(described_class.section(:converter, env: env)[:url]).to eq('http://abs/')
    end

    it 'resolves nested keys through the double-underscore convention' do
      env = { 'EDITOR_DOCSERVER__CALLBACK_SERVER' => 'http://eln.example' }
      section = described_class.section(:editors, env: env)
      expect(section.dig(:docserver, :callback_server)).to eq('http://eln.example')
    end

    context 'with a per-deployment yml' do
      let(:root) { Pathname.new(Dir.mktmpdir) }

      before do
        FileUtils.mkdir_p(root.join('config'))
        FileUtils.cp(Rails.root.join('config/app_config.yml'), root.join('config/app_config.yml'))
        File.write(root.join('config/converter.yml'), <<~YML)
          test:
            :url: 'http://from-yml/'
            :timeout: 120
        YML
      end

      after { FileUtils.remove_entry(root) }

      it 'lets the yml win over Default ENV and structural defaults' do
        env = { 'CONVERTER_URL_DEFAULT' => 'http://def/' }
        section = described_class.section(:converter, env: env, root: root)
        expect(section[:url]).to eq('http://from-yml/')
        expect(section[:timeout]).to eq(120)
      end

      it 'lets Absolute ENV win over the yml' do
        env = { 'CONVERTER_URL' => 'http://abs/' }
        section = described_class.section(:converter, env: env, root: root)
        expect(section[:url]).to eq('http://abs/')
      end
    end

    context 'with template_fallback' do
      it 'merges the yml.example (env-aware) when no live yml exists' do
        section = described_class.section(:ui_components, env: {}, template_fallback: true)
        # ui_components.yml.example test section: both flags false
        expect(section[:weighing_tasks]).to be(false)
        expect(section[:sample_explorer]).to be(false)
      end

      it 'lets ENV win over the template' do
        env = { 'UI_COMPONENT_WEIGHING_TASKS' => 'true' }
        section = described_class.section(:ui_components, env: env, template_fallback: true)
        expect(section[:weighing_tasks]).to be(true)
      end
    end
  end

  describe 'value coercion' do
    it 'coerces booleans, integers, floats and leaves strings alone' do
      env = {
        'UI_COMPONENT_WEIGHING_TASKS' => 'true',
        'CONVERTER_TIMEOUT' => '42',
        'CONVERTER_PROFILE' => 'worker',
      }
      expect(described_class.section(:ui_components, env: env)[:weighing_tasks]).to be(true)
      converter = described_class.section(:converter, env: env)
      expect(converter[:timeout]).to eq(42)
      expect(converter[:profile]).to eq('worker')
    end

    it 'parses JSON arrays and objects with symbolized keys' do
      env = {
        'DATACOLLECTOR_SERVICES' => '[{"name":"mailcollector","every":5}]',
        'STRUCTURE_EDITOR_EDITORS' => '{"ketcher":{"label":"Ketcher"}}',
      }
      services = described_class.section(:datacollectors, env: env)[:services]
      expect(services).to eq([{ name: 'mailcollector', every: 5 }])
      editors = described_class.section(:structure_editors, env: env)[:editors]
      expect(editors.dig(:ketcher, :label)).to eq('Ketcher')
    end

    it 'treats an empty string as explicit unset (nil)' do
      env = { 'CONVERTER_TIMEOUT' => '' }
      expect(described_class.section(:converter, env: env)[:timeout]).to be_nil
    end
  end

  describe '_DEFAULT disambiguation' do
    it 'reads a known key ending in _DEFAULT as an Absolute value' do
      env = { 'USER_PROP_NAME_ABBREVIATION__LENGTH_DEFAULT' => '[2,4]' }
      section = described_class.section(:user_props, env: env)
      expect(section.dig(:name_abbreviation, :length_default)).to eq([2, 4])
    end

    it 'reads the doubled suffix as the Default-tier variable of that key' do
      env = { 'USER_PROP_NAME_ABBREVIATION__LENGTH_DEFAULT_DEFAULT' => '[2,9]' }
      section = described_class.section(:user_props, env: env)
      expect(section.dig(:name_abbreviation, :length_default)).to eq([2, 9])
    end
  end

  describe '.section_options' do
    it 'exposes nested method access and returns nil for unknown keys' do
      options = described_class.section_options(:editors, env: { 'EDITOR_INFO__TITLE' => 'My ELN' })
      expect(options.info.title).to eq('My ELN')
      expect(options.info.unknown_key).to be_nil
    end
  end

  describe '.resolve' do
    it 'resolves a single nested value' do
      env = { 'SPECTRA_CHEMSPECTRA__URL' => 'http://cs:3007' }
      expect(described_class.resolve(:spectra, :chemspectra, :url, env: env)).to eq('http://cs:3007')
    end
  end

  describe '.configured?' do
    it 'is false for all-nil trees and true once any leaf is set' do
      expect(described_class.configured?({ a: nil, b: { c: nil } })).to be(false)
      expect(described_class.configured?({ a: nil, b: { c: 'x' } })).to be(true)
    end
  end
end
