# frozen_string_literal: true

require 'json'
require 'yaml'

module Chemotion
  # ENV-first configuration shim (P0 WP 02 — REQ-ELN-27/28/29/30).
  #
  # Resolves the configuration of a former single-purpose yml file ("section")
  # from up to five layers. Precedence, highest first:
  #
  #   1. Absolute ENV        PREFIX_KEY               (operator-fixed)
  #   2. per-deployment yml  config/<section>.yml     (legacy, still honored)
  #   3. Default ENV         PREFIX_KEY_DEFAULT       (operator default)
  #   4. template fallback   config/<section>.yml.example
  #                          (only with template_fallback: true — used by the
  #                          sections that used to self-heal by copying their
  #                          example at boot: profile_default, ui_components,
  #                          user_props)
  #   5. structural default  config/app_config.yml    (static structure/defaults)
  #
  # Neither set => nil; consumers must treat every setting as optional
  # (REQ-ELN-28).
  #
  # ENV naming (REQ-ELN-28): each section maps to a fixed prefix (PREFIX_MAP).
  # Nested keys are flattened with a double underscore:
  #
  #   editors.yml  :docserver:callback_server -> EDITOR_DOCSERVER__CALLBACK_SERVER
  #   storage.yml  :stores:local:data_folder  -> STORAGE_STORES__LOCAL__DATA_FOLDER
  #
  # List-heavy or free-form subtrees are set as JSON values on the subtree's
  # own variable instead of deep flattening:
  #
  #   DATACOLLECTOR_SFTPUSERS='[{"user":"u1","password":"p1"}]'
  #   PROFILE_DEFAULT_LAYOUT='{"layout":{"sample":1,...}}'
  #
  # Value coercion: "true"/"false" -> booleans, integer/float literals ->
  # numbers, values starting with '[' or '{' -> JSON (symbolized keys),
  # empty string -> nil (explicit unset), anything else -> string.
  #
  # _DEFAULT disambiguation: a variable name is first matched against the
  # section structure in app_config.yml. If the full name maps to a known key
  # (e.g. USER_PROP_NAME_ABBREVIATION__LENGTH_DEFAULT -> :length_default) it is
  # an Absolute value for that key; the Default-tier variable for such a key
  # doubles the suffix (…__LENGTH_DEFAULT_DEFAULT). Only names that do not
  # match a known key are interpreted as PREFIX_KEY_DEFAULT.
  #
  # This module is deliberately tiny: it is the seam the WP 03 tenant-aware
  # resolver will replace (single entry points: .section / .resolve).
  module EnvConfig # rubocop:disable Metrics/ModuleLength
    APP_CONFIG_PATH = 'config/app_config.yml'

    # Fixed prefix per former yml source (REQ-ELN-28).
    PREFIX_MAP = {
      converter: 'CONVERTER',
      datacollectors: 'DATACOLLECTOR',
      editors: 'EDITOR',
      indigo_service: 'INDIGO',
      inference: 'INFERENCE',
      ketcher_service: 'KETCHER_SERVICE',
      profile_default: 'PROFILE_DEFAULT',
      radar: 'RADAR',
      scifinder_n: 'SCIFINDER',
      shrine: 'SHRINE',
      spectra: 'SPECTRA',
      storage: 'STORAGE',
      structure_editors: 'STRUCTURE_EDITOR',
      ui_components: 'UI_COMPONENT',
      user_props: 'USER_PROP',
    }.freeze

    class << self
      # Merged configuration hash (deep-symbolized) for +name+.
      #
      # @param name [Symbol, String] section name (a PREFIX_MAP key)
      # @param env [#each] ENV-like source (injectable for specs)
      # @param root [Pathname] application root (injectable for specs)
      # @param template_fallback [Boolean] merge config/<name>.yml.example when
      #   no live yml exists (replaces the legacy self-healing example copy)
      # @return [Hash]
      def section(name, env: ENV, root: Rails.root, template_fallback: false)
        name = name.to_sym
        live_yml = yml_layer(name, root)
        merged = structure(name, root: root).deep_dup
        merged = merged.deep_merge(template_layer(name, root)) if template_fallback && live_yml.nil?
        merged = merged.deep_merge(env_layer(name, :default, env, root))
        merged = merged.deep_merge(live_yml) if live_yml
        merged.deep_merge(env_layer(name, :absolute, env, root))
      end

      # Same as {.section} but as nested ActiveSupport::OrderedOptions
      # (drop-in for +config_for+ consumers; unknown keys read as nil).
      def section_options(name, **opts)
        to_options(section(name, **opts))
      end

      # Resolve a single value, e.g. resolve(:editors, :docserver, :uri).
      def resolve(name, *key_path, **opts)
        result = section(name, **opts)
        key_path.empty? ? result : result.dig(*key_path.map(&:to_sym))
      end

      # true when the given (sub)tree carries at least one non-nil leaf.
      def configured?(value)
        case value
        when Hash then value.values.any? { |v| configured?(v) }
        when Array then value.any? { |v| configured?(v) }
        when nil, false then false
        else true
        end
      end

      # Structure/defaults for +name+ from config/app_config.yml.
      def structure(name, root: Rails.root)
        app_config(root)[name.to_sym] || {}
      end

      # Drop memoized state (specs).
      def reset!
        @app_config = nil
        @known_paths = nil
      end

      private

      def app_config(root)
        @app_config ||= {}
        @app_config[root.to_s] ||= begin
          path = root.join(APP_CONFIG_PATH)
          if File.exist?(path)
            (YAML.safe_load_file(path, aliases: true) || {}).deep_symbolize_keys
          else
            {}
          end
        end
      end

      def yml_layer(name, root)
        path = root.join('config', "#{name}.yml")
        return nil unless File.exist?(path)

        (Rails.application.config_for(path) || {}).to_h.deep_symbolize_keys
      rescue RuntimeError, NoMethodError, ArgumentError => e
        Rails.logger&.warn("EnvConfig: failed to load #{path}: #{e.message}")
        nil
      end

      def template_layer(name, root)
        path = root.join('config', "#{name}.yml.example")
        return {} unless File.exist?(path)

        (Rails.application.config_for(path) || {}).to_h.deep_symbolize_keys
      rescue RuntimeError, NoMethodError, ArgumentError => e
        Rails.logger&.warn("EnvConfig: failed to load #{path}: #{e.message}")
        {}
      end

      def env_layer(name, kind, env, root)
        prefix = "#{PREFIX_MAP.fetch(name)}_"
        layer = {}
        env.each do |key, value|
          next unless key.is_a?(String) && key.start_with?(prefix)

          rest = key[prefix.length..]
          next if rest.blank?

          var_kind, path = classify(name, rest, root)
          next unless var_kind == kind

          assign_path(layer, path, coerce(value))
        end
        layer
      end

      # -> [:absolute|:default, key_path]
      def classify(name, rest, root)
        path = key_path(rest)
        return [:absolute, path] if known_paths(name, root).include?(path)

        if rest.end_with?('_DEFAULT')
          [:default, key_path(rest.delete_suffix('_DEFAULT'))]
        else
          [:absolute, path]
        end
      end

      def key_path(rest)
        rest.split('__').map { |segment| segment.downcase.to_sym }
      end

      def known_paths(name, root)
        @known_paths ||= {}
        @known_paths["#{root}/#{name}"] ||= collect_paths(structure(name, root: root), []).to_set
      end

      def collect_paths(node, prefix)
        return [] unless node.is_a?(Hash)

        node.flat_map do |key, value|
          path = prefix + [key]
          [path] + collect_paths(value, path)
        end
      end

      def assign_path(hash, path, value)
        *parents, leaf = path
        target = parents.reduce(hash) { |node, key| node[key] ||= {} }
        target[leaf] = value
      end

      def coerce(raw)
        return nil if raw.nil?

        value = raw.to_s.strip
        case value
        when '' then nil
        when 'true' then true
        when 'false' then false
        when /\A-?\d+\z/ then Integer(value, 10)
        when /\A-?\d+\.\d+\z/ then Float(value)
        else coerce_json(value, raw)
        end
      end

      def coerce_json(value, raw)
        return raw unless value.start_with?('[', '{')

        JSON.parse(value, symbolize_names: true)
      rescue JSON::ParserError
        raw
      end

      def to_options(value)
        case value
        when Hash
          value.each_with_object(ActiveSupport::OrderedOptions.new) do |(key, val), options|
            options[key] = to_options(val)
          end
        when Array
          value.map { |element| to_options(element) }
        else
          value
        end
      end
    end
  end
end
