# frozen_string_literal: true

# WP 03: AppConfig memoizes resolved sections per process (keyed by the shared
# cache version) and keeps DB rows in Rails.cache. Transactional tests roll
# writes back without firing another bust, so both caches could leak
# rolled-back tenant_settings into later examples — bust before every example.
RSpec.configure do |config|
  config.before do
    AppConfig.bust!
  end
end
