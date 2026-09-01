# frozen_string_literal: true

# WP 03 (REQ-ELN-31/8/9) — the central config resolver.
#
# Resolution order per key, highest first:
#
#   1. Absolute ENV   PREFIX_KEY            (operator-fixed — beats everything,
#                                            rendered read-only in the UI, REQ-ELN-8)
#   2. DB Tenant-set  tenant_settings(+_secrets)  (request-time, cached — an
#                                            admin's save applies without restart)
#   3. per-deployment yml  config/<section>.yml   (legacy, still honored)
#   4. Default ENV    PREFIX_KEY_DEFAULT    (operator default)
#   5. template / structural defaults (app_config.yml) — WP 02 layers
#   6. nil — consumers treat every setting as optional (REQ-ELN-28)
#
# The ENV/yml/template/static layers come from the WP 02 shim
# (Chemotion::EnvConfig.layers); this class only adds the DB tier, caching and
# provenance. Sections outside EnvConfig::PREFIX_MAP (smtp, messaging,
# datacite, signup) fall back to their legacy single ENV variables
# (ENV_FALLBACKS), which rank as the Default tier — DB overrides them, per the
# inventory §0 decisions (operator relay/contract = default, tenant may
# override).
#
# Caching (never at boot — Rails 7.2: models must not autoload at initializer
# time, so the DB tier is request/job-time only):
#   * Rails.cache entry per section, keyed by a version counter
#     (CACHE_VERSION_KEY) that every tenant_settings write increments — a bump
#     invalidates all cached sections at once, across processes when the cache
#     store is shared (production should run a shared store; on a NullStore
#     the resolver degrades to direct DB reads, which stays correct).
#   * a small per-process memo keyed by that version with a short TTL
#     (belt-and-braces for non-shared stores). delayed_job workers go through
#     exactly this same path — there is no boot snapshot in this class.
#
# Secrets: values under TenantSetting::SECRET_KEYS live encrypted in
# tenant_setting_secrets. They are merged into `get` results for server-side
# consumers but are never written into Rails.cache (no plaintext at rest in a
# file cache) and are masked in `effective`.
module AppConfig # rubocop:disable Metrics/ModuleLength -- one resolver: tiers, cache, provenance belong together
  CACHE_VERSION_KEY = 'app_config:tenant_settings:version'
  DB_CACHE_PREFIX = 'app_config:db'
  MEMO_TTL_SECONDS = 5

  # Sections whose .yml.example doubles as fallback (WP 02 legacy self-heal).
  TEMPLATE_FALLBACK_SECTIONS = %i[profile_default ui_components user_props].freeze

  # Legacy single-ENV sections (no PREFIX/PREFIX_DEFAULT pair, §4.2–§4.4 of
  # the inventory). These rank as the Default tier: DB overrides them.
  ENV_FALLBACKS = {
    smtp: {
      address: 'SMTP_ADDRESS', port: 'SMTP_PORT', domain: 'SMTP_DOMAIN',
      username: 'SMTP_USERNAME', password: 'SMTP_PASSWORD',
      authentication: 'SMTP_AUTH', tls: 'SMTP_TLS', ssl_mode: 'SMTP_SSL_MODE',
      disable_delivery: 'DISABLE_MAIL_DELIVERY'
    },
    messaging: {
      enable: 'MESSAGE_ENABLE', auto_interval: 'MESSAGE_AUTO_INTERNAL',
      idle_time: 'MESSAGE_IDLE_TIME'
    },
    datacite: {
      prefix: 'DATA_CITE_PREFIX', device_prefix: 'DATA_CITE_DEVICE_PREFIX',
      research_plan_prefix: 'DATA_CITE_RESEARCH_PLAN_PREFIX',
      base_uri: 'DATA_CITE_BASE_URI', api_username: 'DATA_CITE_API_USERNAME',
      api_password: 'DATA_CITE_API_PASSWORD',
      device_publisher: 'DATA_CITE_DEVICE_PUBLISHER',
      device_creator: 'DATA_CITE_DEVICE_CREATOR'
    },
    signup: {
      disabled: 'DEVISE_DISABLED_SIGN_UP',
      new_account_inactive: 'DEVISE_NEW_ACCOUNT_INACTIVE',
      allow_unconfirmed: 'DEVISE_ALLOW_UNCONFIRMED', sender: 'DEVISE_SENDER'
    },
    guests: {
      write_escalation: 'TENANT_GUEST_WRITE_ESCALATION',
      max_permission_level: 'TENANT_GUEST_MAX_PERMISSION_LEVEL'
    },
    identity: {
      group_rules: 'TENANT_IDENTITY_GROUP_RULES'
    },
  }.freeze

  # Static defaults for ENV_FALLBACKS sections whose keys must always render
  # in the admin settings UI even when neither ENV nor a DB row exists
  # (P1 WP 06: the guest policy switch ships visible-but-off).
  STATIC_FALLBACK_DEFAULTS = {
    guests: { write_escalation: '', max_permission_level: '0' }.freeze,
    # [] (not '') so the admin UI renders the JSON editor (REQ-ELN-6)
    identity: { group_rules: [].freeze }.freeze,
  }.freeze

  # REQ-ELN-9 / ADR-007: the enumerated boot-wired surface. A change here
  # persists but only takes effect after an operator-executed restart (chemop
  # picks up the 'config.restart_requested' audit events — the app never
  # self-restarts). Tenant-settable sections list the affected key paths;
  # the :all rows document structurally boot-only, non-tenant surfaces for the
  # UI/status layer.
  RESTART_REQUIRED = {
    # tenant-settable sections with boot-wired keys:
    'smtp' => :all, # ActionMailer settings frozen at boot (mail.rb)
    'signup' => %w[disabled allow_unconfirmed sender], # routes / Devise boot / mailer class default
    'datacite' => %w[prefix device_prefix research_plan_prefix base_uri
                     device_publisher device_creator], # class-load constants
    'scifinder_n' => :all, # provider_builder runs at boot (scifinder_n.rb)
    'datacollectors' => %w[services], # cron registration (delayed_job_config.rb)
    'editors' => %w[docserver.uri docserver.api], # CSP allowlist built at boot
    # structurally boot-only, not tenant-settable (documentation for the UI):
    'devise' => :all,   # security baseline (devise.rb)
    'omniauth' => :all, # provider registration from the userProvider matrice
    'storage' => :all,  # storage.yml / lib/storage
    'shrine' => :all,   # Shrine.storages built at boot
    'session' => :all,  # session_store.rb
    'csp' => :all,      # content_security_policy.rb
    'cron' => :all,     # CRON_CONFIG_* + init_cron_jobs
    'database' => :all, # database.yml (bootstrap secret territory)
  }.freeze

  class << self
    # Resolve one value (or a whole section when no key path is given):
    #   AppConfig.get(:ketcher_service, :url)
    #   AppConfig.get(:editors, :docserver, :callback_server)
    def get(section, *key_path, env: ENV)
      merged = merged_section(section.to_sym, env: env)
      key_path.empty? ? merged : merged.dig(*key_path.map(&:to_sym))
    end

    # Merged section as a flat { 'dot.path' => { value:, source:, read_only:,
    # secret:, restart_required: } } map — provenance surface for the WP 04
    # admin UI and status introspection. Secret values are masked
    # (TenantSetting::SECRET_PLACEHOLDER); Absolute-ENV keys are read-only
    # (REQ-ELN-8).
    def effective(section, env: ENV)
      section = section.to_sym
      flat = {}
      resolution_layers(section, env: env, with_secrets: false).each do |source, tree|
        flatten(tree).each { |path, value| flat[path] = { value: value, source: source } }
      end
      mark_db_secrets(flat, section)
      decorate(flat, section)
    end

    def restart_required?(section, key)
      spec = RESTART_REQUIRED[section.to_s]
      return false unless spec

      spec == :all || spec.include?(key.to_s)
    end

    # The full restart-set enumeration (for the UI/API layer).
    def restart_required
      RESTART_REQUIRED
    end

    # Invalidate every cached section: bump the shared version counter and
    # drop the per-process memo. Called from the TenantSetting(+Secret)
    # callbacks on every write.
    def bust!
      reset_memo!
      Rails.cache.increment(CACHE_VERSION_KEY, 1) || Rails.cache.write(CACHE_VERSION_KEY, 1)
    rescue StandardError => e
      Rails.logger&.warn("AppConfig.bust!: cache version bump failed (#{e.class}: #{e.message})")
      nil
    end

    def reset_memo!
      @memo = nil
    end

    def cache_version
      Rails.cache.read(CACHE_VERSION_KEY).to_i
    rescue StandardError
      0
    end

    private

    # Per-process memo keyed by the shared cache version (stale entries die on
    # any bust) with a short TTL as a safety net for non-shared cache stores.
    # Only used for reads against the real ENV (spec injections bypass it).
    def merged_section(section, env:)
      return build_section(section, env: env) unless env.equal?(ENV)

      version = cache_version
      now = Process.clock_gettime(Process::CLOCK_MONOTONIC)
      if @memo.nil? || @memo[:version] != version || now - @memo[:at] > MEMO_TTL_SECONDS
        @memo = { version: version, at: now, sections: {} }
      end
      @memo[:sections][section] ||= build_section(section, env: env)
    end

    def build_section(section, env:)
      resolution_layers(section, env: env, with_secrets: true)
        .values
        .reduce({}) { |merged, layer| merged.deep_merge(layer) }
    end

    # Ordered low -> high priority. Provenance tags are the keys.
    def resolution_layers(section, env:, with_secrets:)
      base = env_config_layers(section, env)
      {
        'static' => base[:static],
        'template' => base[:template],
        'env-default' => base[:env_default],
        'yml' => base[:yml],
        'db' => db_layer(section, with_secrets: with_secrets),
        'env-absolute' => base[:env_absolute],
      }
    end

    def env_config_layers(section, env)
      if Chemotion::EnvConfig::PREFIX_MAP.key?(section)
        Chemotion::EnvConfig.layers(
          section, env: env, template_fallback: TEMPLATE_FALLBACK_SECTIONS.include?(section)
        )
      else
        { static: (STATIC_FALLBACK_DEFAULTS[section] || {}).dup, template: {},
          env_default: env_fallback_layer(section, env), yml: {}, env_absolute: {} }
      end
    end

    # Legacy single ENV variables kept as raw strings (their consumers own the
    # coercion, unchanged legacy semantics).
    def env_fallback_layer(section, env)
      (ENV_FALLBACKS[section] || {}).each_with_object({}) do |(key, var), layer|
        value = env[var]
        layer[key] = value unless value.nil?
      end
    end

    # DB tier. Fail-open to {} when the table/DB is unavailable (rake tasks,
    # half-migrated boots) — the ENV/yml tiers then carry the configuration.
    def db_layer(section, with_secrets:)
      tree = {}
      cached_db_rows(section).each { |key, value| assign_path(tree, key, symbolize(value)) }
      merge_db_secrets(tree, section) if with_secrets
      tree
    rescue ActiveRecord::ActiveRecordError, PG::Error => e
      Rails.logger&.warn("AppConfig: tenant_settings unavailable (#{e.class}: #{e.message}); using ENV/yml tiers")
      {}
    end

    # Plain rows may go into Rails.cache; secrets never do (see class doc).
    def cached_db_rows(section)
      Rails.cache.fetch("#{DB_CACHE_PREFIX}:#{section}:v#{cache_version}") do
        TenantSetting.where(section: section.to_s).pluck(:key, :value).to_h
      end || {}
    end

    def merge_db_secrets(tree, section)
      TenantSettingSecret.where(section: section.to_s).find_each do |row|
        assign_path(tree, row.key, row.secret)
      end
    end

    # Mark keys that carry a secret override in the DB (their value never
    # entered the flat map — db rows are read without secrets in `effective`).
    def mark_db_secrets(flat, section)
      TenantSettingSecret.where(section: section.to_s).pluck(:key).each do |key|
        flat[key] = { value: TenantSetting::SECRET_PLACEHOLDER, source: 'db' }
      end
    rescue ActiveRecord::ActiveRecordError, PG::Error
      nil
    end

    def decorate(flat, section)
      secret_paths = TenantSetting::SECRET_KEYS.fetch(section.to_s, [])
      flat.each do |path, entry|
        secret = secret_paths.include?(path)
        entry[:value] = TenantSetting::SECRET_PLACEHOLDER if secret && !entry[:value].nil?
        entry[:source] = 'nil' if entry[:value].nil?
        entry[:read_only] = entry[:source] == 'env-absolute'
        entry[:secret] = secret
        entry[:restart_required] = restart_required?(section, path)
      end
    end

    def flatten(node, prefix = nil, acc = {})
      if node.is_a?(Hash) && !node.empty?
        node.each { |key, value| flatten(value, [prefix, key].compact.join('.'), acc) }
      elsif prefix
        acc[prefix] = node
      end
      acc
    end

    def assign_path(tree, dotted_key, value)
      *parents, leaf = dotted_key.to_s.split('.').map(&:to_sym)
      target = parents.reduce(tree) do |node, key|
        node[key] = {} unless node[key].is_a?(Hash)
        node[key]
      end
      target[leaf] = value
    end

    def symbolize(value)
      value.is_a?(Hash) ? value.deep_symbolize_keys : value
    end
  end
end
