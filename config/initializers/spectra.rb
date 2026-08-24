# frozen_string_literal: true

# Spectra services (chemspectra + NMRium wrapper).
# WP 02, ENV-first — REQ-ELN-27/28: resolves through Chemotion::EnvConfig
# (SPECTRA_* ENV pair > config/spectra.yml (optional) > app_config.yml).
require_relative '../../lib/chemotion/env_config'

Rails.application.configure do
  config.spectra = ActiveSupport::OrderedOptions.new
  config.spectra.chemspectra = ActiveSupport::OrderedOptions.new
  config.spectra.nmriumwrapper = ActiveSupport::OrderedOptions.new

  spectra_config = Chemotion::EnvConfig.section(:spectra)

  # check if the legacy flat schema (yml-only) is present
  if spectra_config[:url].present? || spectra_config[:port].present?
    Rails.logger.info(
      "Chemspectra configurations that use 'url' and 'port' will deprecated soon. " \
      "Please update your 'spectra.yml' file to use 'chemspectra.url' instead.",
    )
    if spectra_config[:url].present? && spectra_config[:port].present?
      url  = spectra_config[:url]
      port = spectra_config[:port]
      config.spectra.chemspectra.url = "http://#{url}:#{port}"
    end
  end

  # if new config is present, it takes precendence
  if spectra_config.dig(:chemspectra, :url).present?
    config.spectra.chemspectra.url = spectra_config.dig(:chemspectra, :url)
  end

  # add the config for NMRiumWrapper
  if spectra_config.dig(:nmriumwrapper, :url).present?
    config.spectra.nmriumwrapper.url = spectra_config.dig(:nmriumwrapper, :url)
  end

  # let's get loud!
  if config.spectra.chemspectra.url.nil?
    Rails.logger.warn('No endpoint url set for Chemspectra, it will not be available.')
  else
    Rails.logger.info("Chemspectra endpoint is configured to be '#{config.spectra.chemspectra.url}'.")
  end

  if config.spectra.nmriumwrapper.url.nil?
    Rails.logger.warn('No endpoint url set for NMRiumWrapper, it will not be available.')
  else
    Rails.logger.info("NMRiumWrapper endpoint configured to be '#{config.spectra.nmriumwrapper.url}'.")
  end
end
