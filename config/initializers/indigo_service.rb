# frozen_string_literal: true

# This initializer loads the optional configuration for:
#   the indigo service
# WP 02, ENV-first — REQ-ELN-27/28: resolves through Chemotion::EnvConfig
# (INDIGO_* ENV pair > config/indigo_service.yml (optional) > app_config.yml).
require_relative '../../lib/chemotion/env_config'

# Specific
validations = lambda do |config, service|
  raise ArgumentError, 'no indigo_service_url configured' if config.send(service)&.indigo_service_url.blank?

  url = URI.parse(config.send(service).indigo_service_url)
  raise ArgumentError, "Invalid URL: #{url}" unless url.host && %w[http https].include?(url.scheme)

  # set description
  config.send(service).desc = "service hosted at: #{url}"
end

# Generic initialization
service = File.basename(__FILE__, '.rb').to_sym # Service name
service_setter = :"#{service}=" # Service setter
ref = "Initializing #{service}:" # Message prefix

Rails.application.configure do
  config.send(service_setter, Chemotion::EnvConfig.section_options(service))
  validations.call(config, service) # Validate configuration
rescue RuntimeError, NoMethodError, ArgumentError, URI::InvalidURIError => e
  Rails.logger.warn "#{ref} Error while loading configuration #{e.message}"
  # Create service key or clear config
  config.send(service_setter, nil)
ensure
  # Load default missing configuration if the service is not configured
  config.send(service_setter, config_for(:default_missing)) unless config.send(service)
  Rails.logger.info "#{ref} #{config.send(service).desc}"
end
