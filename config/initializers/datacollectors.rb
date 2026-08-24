# frozen_string_literal: true

# Datacollector configuration (WP 02, ENV-first — REQ-ELN-27/28).
# Resolves through Chemotion::EnvConfig: DATACOLLECTOR_* ENV pair >
# config/datacollectors.yml (optional) > app_config.yml structure defaults.
require_relative '../../lib/chemotion/env_config'

service = File.basename(__FILE__, '.rb').to_sym # Service name
service_setter = :"#{service}=" # Service setter
ref = "Initializing #{service}:" # Message prefix

Rails.application.configure do
  config.send(service_setter, Chemotion::EnvConfig.section_options(service))
rescue StandardError => e
  Rails.logger.warn "#{ref} Error while loading configuration #{e.message}"
  # Create service key or clear config
  config.send(service_setter, nil)
end
