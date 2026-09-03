# frozen_string_literal: true

# Labimotion converter-app client configuration (former converter.yml).
# WP 02, ENV-first — REQ-ELN-27/28: resolves through Chemotion::EnvConfig
# (CONVERTER_* ENV pair > config/converter.yml (optional) > app_config.yml).
# config.converter is now always defined (url may be nil when the service is
# unconfigured) so consumers degrade gracefully instead of hitting an
# undefined configuration key.
require_relative '../../lib/chemotion/env_config'

converter_config = Chemotion::EnvConfig.section(:converter)

Rails.application.configure do
  config.converter = ActiveSupport::OrderedOptions.new
  config.converter.url = converter_config[:url]
  config.converter.profile = converter_config[:profile]
  config.converter.secret_key = converter_config[:secret_key]
  config.converter.timeout = converter_config[:timeout]
  config.converter.ext = converter_config[:ext]
end
