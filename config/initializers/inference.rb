# frozen_string_literal: true

# Reaction-prediction (inference) service configuration (former inference.yml).
# WP 02, ENV-first — REQ-ELN-27/28: resolves through Chemotion::EnvConfig
# (INFERENCE_* ENV pair > config/inference.yml (optional) > app_config.yml).
# When no layer configures a url, the legacy fallback to the
# 'reactionPrediction' matrice record still applies.
#
# Runs in after_initialize so Matrice is not autoloaded during initialization
# (an error in Rails 7). config.inference is read only at request time.
require_relative '../../lib/chemotion/env_config'

Rails.application.config.after_initialize do
  Rails.application.configure do
    inference_config = Chemotion::EnvConfig.section(:inference)

    if inference_config[:url].blank?
      begin
        matrice_config =
          if ActiveRecord::Base.connection.table_exists?('matrices')
            Matrice.find_by(name: 'reactionPrediction')&.configs&.symbolize_keys || {}
          else
            {}
          end
        inference_config = inference_config.merge(matrice_config.slice(:url, :port))
      rescue ActiveRecord::StatementInvalid, PG::ConnectionBad, PG::UndefinedTable
      end
    end

    config.inference = ActiveSupport::OrderedOptions.new
    config.inference.url = inference_config[:url]
    config.inference.port = inference_config[:port]
  end
end
