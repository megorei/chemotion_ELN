# frozen_string_literal: true

# This initializer loads the optional configuration for:
#   the ketcher rendering service
# WP 02, ENV-first — REQ-ELN-27/28: resolves through Chemotion::EnvConfig
# (KETCHER_SERVICE_* ENV pair > config/ketcher_service.yml (optional) >
# app_config.yml).
require_relative '../../lib/chemotion/env_config'

# Specific
validations = lambda do |config, service|
  raise ArgumentError, 'no url configured' if config.send(service)&.url.blank?

  url = URI.parse(config.send(service).url)
  raise ArgumentError, "Invalid URL: #{url}" unless url.host && %w[http https].include?(url.scheme)

  # set description
  config.send(service).desc = "service hosted at: #{url}"
end

# Generic initialization
service = File.basename(__FILE__, '.rb').to_sym # Service name
service_setter = :"#{service}=" # Service setter
ref = "Initializing #{service}:" # Message prefix

Rails.application.configure do
  config.send(service_setter, Chemotion::EnvConfig.section_options(service))
  validations.call(config, service) # Validate configuration
rescue RuntimeError, NoMethodError, ArgumentError, URI::InvalidURIError => e
  Rails.logger.warn "#{ref} Error while loading configuration #{e.message}"
  # Create service key or clear config
  config.send(service_setter, nil)
ensure
  # Load default missing configuration if the service is not configured
  config.send(service_setter, config_for(:default_missing)) unless config.send(service)
  Rails.logger.info "#{ref} #{config.send(service).desc}"
end

# Copy uploads/common_templates/instance.json to public/ketcher/common_templates_list.json
# CommonTemplateExporter::TEMPLATES_INSTANCE
# source = Rails.root.join('uploads', 'common_templates', 'instance.json')
# Destination:
# Remove previous public/json/ketcher_common_templates.json files

begin
  require Rails.root.join('lib/tasks/support/ketcher_common_templates_exporter.rb')
  source = KetcherCommonTemplatesExporter::TEMPLATES_INSTANCE
  source = KetcherCommonTemplatesExporter::TEMPLATES_DEFAULT unless File.exist?(source)
  destination = KetcherCommonTemplatesExporter::TEMPLATES_PUBLIC

  FileUtils.rm_rf(Dir.glob(destination))
  FileUtils.cp(source, destination)

  Rails.logger.info "Ketcher common templates copied from #{source} to #{destination}"
rescue StandardError => error
  Rails.logger.warn error
  Rails.logger.warn "Ketcher common templates source file not found: #{source}"
end
