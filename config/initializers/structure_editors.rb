# frozen_string_literal: true

# This initializer loads the optional configuration for:
#   the additional structure editors
# WP 02, ENV-first — REQ-ELN-27/28: resolves through Chemotion::EnvConfig
# (STRUCTURE_EDITOR_* ENV pair > config/structure_editors.yml (optional) >
# app_config.yml).
require_relative '../../lib/chemotion/env_config'

# Specific
validations = lambda do |config, service|
  editor_count = config.send(service).editors.size
  raise ArgumentError, 'No Editor config' unless editor_count.positive?

  # set description
  config.send(service).desc = "#{editor_count} optional editors"
end

# Generic initialization
service = File.basename(__FILE__, '.rb').to_sym # Service name
service_setter = :"#{service}=" # Service setter
ref = "Initializing #{service}:" # Message prefix

Rails.application.configure do
  config.send(service_setter, Chemotion::EnvConfig.section_options(service))
  validations.call(config, service) # Validate and set description
rescue RuntimeError, NoMethodError, ArgumentError, URI::InvalidURIError => e
  Rails.logger.warn "#{ref} Error while loading configuration #{e.message}"
  # Create service key or clear config
  config.send(service_setter, nil)
ensure
  # Load default missing configuration if no editors are configured
  config.send(service_setter, config_for(:default_missing)) unless config.send(service)
  Rails.logger.info "#{ref} #{config.send(service).desc}"
end
