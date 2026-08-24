# frozen_string_literal: true

# User/device name-abbreviation validation rules (former user_props.yml).
# WP 02, ENV-first — REQ-ELN-27/28: resolves through Chemotion::EnvConfig
# (USER_PROP_* ENV pair > config/user_props.yml (optional) >
# user_props.yml.example template > app_config.yml).
#
# The former self-healing copy of the example into config/ at boot is gone
# (container-unfriendly boot write); the example is now read directly as the
# shipped default when no live yml exists. format_abbr may be a plain regexp
# source string (ENV/template) or a Regexp (legacy yml !ruby/regexp) — the
# consumers match via String#match?, which accepts both.
require_relative '../../lib/chemotion/env_config'

begin
  user_props_config = Chemotion::EnvConfig.section(:user_props, template_fallback: true)

  Rails.application.configure do
    config.user_props = ActiveSupport::OrderedOptions.new
    config.user_props.name_abbr = user_props_config[:name_abbreviation]
  end
rescue StandardError => e
  Rails.logger.error e.message
  Rails.application.configure do
    # (used to wrongly clear config.editors here — inventory §0.7 bug)
    config.user_props = ActiveSupport::OrderedOptions.new
  end
end
