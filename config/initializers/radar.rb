# frozen_string_literal: true

# RADAR research-data archive (OAuth2) configuration (former radar.yml).
# WP 02, ENV-first — REQ-ELN-27/28: resolves through Chemotion::EnvConfig
# (RADAR_* ENV pair > config/radar.yml (optional) > app_config.yml).
# config.radar stays nil while no url is configured, so the existing
# 'RADAR credentials not initialized!' guards in the consumers keep working.
require_relative '../../lib/chemotion/env_config'

begin
  radar_config = Chemotion::EnvConfig.section(:radar)

  Rails.application.configure do
    if radar_config[:url].present?
      config.radar = ActiveSupport::OrderedOptions.new
      config.radar.url = radar_config[:url]
      config.radar.client_id = radar_config[:client_id]
      config.radar.client_secret = radar_config[:client_secret]
      config.radar.redirect_uri = radar_config[:redirect_uri]
      config.radar.email = radar_config[:email]
      config.radar.backlink = radar_config[:backlink]
      config.radar.publisher = radar_config[:publisher]
      config.radar.resource = radar_config[:resource]
      config.radar.resourceType = radar_config[:resourceType]
      config.radar.softwareName = radar_config[:softwareName]
      config.radar.softwareVersion = radar_config[:softwareVersion]
    else
      config.radar = nil
    end
  end
rescue StandardError => e
  Rails.logger&.warn "Initializing radar: #{e.message}"
  Rails.application.configure do
    config.radar = nil
  end
end
