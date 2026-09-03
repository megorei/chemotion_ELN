# frozen_string_literal: true

# Shrine attachment storage (WP 02, ENV-first — REQ-ELN-27/28).
#
# Settings resolve through Chemotion::EnvConfig (SHRINE_* ENV pair >
# config/shrine.yml > app_config.yml defaults). A missing shrine.yml is no
# longer a boot crash: unset paths fall back to the conventional per-env
# upload directories below (matching the former shrine.yml.example values).
require 'shrine'
require 'shrine/storage/file_system'
require_relative '../../lib/chemotion/env_config'

shrine_config = Chemotion::EnvConfig.section(:shrine)

default_store = Rails.env.production? ? 'uploads' : "uploads/#{Rails.env}"
maximum_size = shrine_config[:maximum_size] || 100
cache_path = shrine_config[:cache].presence || "#{default_store}/cache"
store_path = shrine_config[:store].presence || default_store

Rails.application.configure do
  config.shrine_storage = ActiveSupport::OrderedOptions.new
  config.shrine_storage.maximum_size = maximum_size
  config.shrine_storage.cache = cache_path
  config.shrine_storage.store = store_path
end

Shrine.storages = {
  cache: Shrine::Storage::FileSystem.new(cache_path), # temporary
  store: Shrine::Storage::FileSystem.new(store_path), # permanent
}

Shrine.plugin :activerecord           # loads Active Record integration
Shrine.plugin :derivatives
Shrine.plugin :cached_attachment_data # enables retaining cached file across form redisplays
Shrine.plugin :restore_cached_data    # extracts metadata for assigned cached files
Shrine.plugin :signature              # adds MD5 signature metadata to uploaded files
Shrine.plugin :determine_mime_type, analyzer: :marcel
