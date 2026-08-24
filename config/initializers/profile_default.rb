# frozen_string_literal: true

# Default element-layout profile for new users (former profile_default.yml).
# WP 02, ENV-first — REQ-ELN-27/28: resolves through Chemotion::EnvConfig
# (PROFILE_DEFAULT_* ENV pair > config/profile_default.yml (optional) >
# profile_default.yml.example template > app_config.yml).
#
# The former self-healing copy of the example into config/ at boot is gone
# (container-unfriendly boot write); the example is now read directly as the
# shipped default when no live yml exists.
require_relative '../../lib/chemotion/env_config'

begin
  profile_default_config = Chemotion::EnvConfig.section(:profile_default, template_fallback: true)

  Rails.application.configure do
    config.profile_default = ActiveSupport::OrderedOptions.new
    config.profile_default.layout = profile_default_config[:layout]
  end
rescue StandardError => e
  Rails.logger.error e.message
  Rails.application.configure do
    # (used to wrongly clear config.editors here — inventory §0.7 bug)
    config.profile_default = ActiveSupport::OrderedOptions.new
  end
end
