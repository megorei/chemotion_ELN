# frozen_string_literal: true

# Loads the optional configuration that enables or disables UI components
# conditionally. The config is a simple map of component name => boolean,
# e.g. `:weighing_tasks: true`.
#
# WP 02, ENV-first — REQ-ELN-27/28: resolves through Chemotion::EnvConfig
# (UI_COMPONENT_* ENV pair > config/ui_components.yml (optional) >
# ui_components.yml.example template > app_config.yml). The former
# self-healing copy of the example into config/ at boot is gone
# (container-unfriendly boot write).
#
# Optional components are opt-in: a component is enabled only when its value is
# `true` (see UiComponents.enabled?). If loading fails, config.ui_components is
# left empty so every optional component stays disabled (fail closed). The
# parsed configuration is exposed to the frontend through GET /api/v1/ui/initialize.
require_relative '../../lib/chemotion/env_config'

begin
  ui_components_settings = Chemotion::EnvConfig.section(:ui_components, template_fallback: true)

  Rails.application.configure do
    config.ui_components = ActiveSupport::OrderedOptions.new
    ui_components_settings.each do |component, enabled|
      config.ui_components[component] = enabled
    end
  end
rescue StandardError => e
  Rails.logger.error "ui_components: failed to load configuration (#{e.message}); optional components disabled"
  Rails.application.configure do
    config.ui_components = ActiveSupport::OrderedOptions.new
  end
end
