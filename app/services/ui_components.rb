# frozen_string_literal: true

# Helper to check whether an optional UI component is enabled.
#
# WP 03 (REQ-ELN-31): reads through the AppConfig resolver at request time —
# DB tenant tier (tenant_settings) > UI_COMPONENT_* ENV pair >
# config/ui_components.yml > template/structural defaults. A tenant admin's
# save applies without restart; the boot snapshot in
# config/initializers/ui_components.rb remains only as a thin facade for
# legacy Rails.configuration readers.
#
# Optional components are OPT-IN and fail closed: a component is enabled only
# when its config value is explicitly `true`. Anything else - `false`, an
# unlisted component, a missing/blank configuration, or a failure to resolve
# the configuration - leaves it disabled. This matches the frontend behaviour
# in src/utilities/UIComponentHelper.js.
module UiComponents
  module_function

  # Effective component map (fail closed: {} on any resolver error).
  # @return [Hash]
  def config
    AppConfig.get(:ui_components) || {}
  rescue StandardError => e
    Rails.logger.warn("UiComponents: resolver failed (#{e.class}: #{e.message}); optional components disabled")
    {}
  end

  # @param name [Symbol, String] the component key, e.g. :weighing_tasks
  # @return [Boolean]
  def enabled?(name)
    config[name.to_sym] == true
  end
end
