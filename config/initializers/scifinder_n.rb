# frozen_string_literal: true

# SciFinder-n (CAS) integration (former scifinder_n.yml).
# WP 02, ENV-first — REQ-ELN-27/28: resolves through Chemotion::EnvConfig
# (SCIFINDER_* ENV pair > config/scifinder_n.yml (optional) > app_config.yml).
# config.sfn_config is now always defined; provider stays nil while
# unconfigured so consumers can degrade gracefully (REQ-ELN-28).
require_relative '../../lib/chemotion/env_config'

sfn_config = Chemotion::EnvConfig.section(:scifinder_n)
provider = sfn_config[:provider]
provider = nil unless Chemotion::EnvConfig.configured?(provider)

Rails.application.configure do
  config.sfn_config = ActiveSupport::OrderedOptions.new
  config.sfn_config.provider = provider
end

if provider
  begin
    Chemotion::ScifinderNService.provider_builder
  rescue StandardError => e
    Rails.logger&.warn "Initializing scifinder_n: provider_builder failed (#{e.message})"
  end
end
