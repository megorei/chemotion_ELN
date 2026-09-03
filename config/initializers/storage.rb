# frozen_string_literal: true

# Legacy file storage (pre-Shrine; still boot-required by lib/storage and
# TransferFileFromTmpJob). WP 02, ENV-first — REQ-ELN-27/28.
#
# Settings resolve through Chemotion::EnvConfig (STORAGE_* ENV pair >
# config/storage.yml > app_config.yml defaults). A missing storage.yml is no
# longer a boot crash: unset values fall back to the conventional local
# stores below (matching the former storage.yml.example values).
require_relative '../../lib/chemotion/env_config'

storage_config = Chemotion::EnvConfig.section(:storage)

default_stores = lambda do
  folder = Rails.env.production? ? 'uploads' : "uploads/#{Rails.env}"
  {
    tmp: { data_folder: "tmp/#{folder}", thumbnail_folder: "tmp/#{folder}" },
    local: { data_folder: folder, thumbnail_folder: folder },
  }
end

Rails.application.configure do
  config.storage = ActiveSupport::OrderedOptions.new
  config.storage.stores = storage_config[:stores] || default_stores.call
  config.storage.primary_store = storage_config[:primary_store] || 'local'
  config.storage.secondary_store = storage_config[:secondary_store] || ''
  config.storage.maximum_size = storage_config[:maximum_size] || 100
end
