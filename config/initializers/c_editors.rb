# frozen_string_literal: true

# OnlyOffice document server + imprint info (former editors.yml).
# WP 02, ENV-first — REQ-ELN-27/28: resolves through Chemotion::EnvConfig
# (EDITOR_* ENV pair > config/editors.yml (optional) > app_config.yml).
require_relative '../../lib/chemotion/env_config'

begin
  editors_config = Chemotion::EnvConfig.section(:editors)

  Rails.application.configure do
    config.editors = ActiveSupport::OrderedOptions.new
    config.editors.docserver = editors_config[:docserver] if editors_config
    config.editors.info = editors_config[:info] if editors_config
    location = URI.join(editors_config[:docserver][:uri], editors_config[:docserver][:api])
    if location.is_a?(URI::HTTP)
      config.editors.docserver_api = location.to_s
    else
      config.editors = nil
    end
    available_extensions = config.editors.docserver&.fetch(:ext, [])&.flatten(2)&.filter { |ext| ext.is_a?(String) }
    config.editors.available_extensions = available_extensions
  end
rescue StandardError => e
  Rails.logger.error e.message
  Rails.application.configure do
    config.editors = nil
  end
end
