# frozen_string_literal: true

require 'simplecov'
require 'simplecov-lcov'
require "simplecov-html"

SimpleCov::Formatter::LcovFormatter.config.report_with_single_file = true
SimpleCov.formatters = SimpleCov::Formatter::MultiFormatter.new([
  SimpleCov::Formatter::HTMLFormatter,
  SimpleCov::Formatter::LcovFormatter,
])

SimpleCov.start 'rails' do
  add_group 'GraphQL', 'app/graphql'
  add_group 'REST API', 'app/api'
  add_filter 'app/graphql/chemotion_schema.rb'
  add_filter 'app/channels'
end

# This file is copied to spec/ when you run 'rails generate rspec:install'
ENV['RAILS_ENV'] ||= 'test'
require 'spec_helper'

# WP 02 (REQ-ELN-29): the datacollector test configuration used to be
# generated through ERB in config/datacollectors.yml (Dir.mktmpdir, Dir.home)
# — ERB in config ymls is banned. The dynamic test values are provided through
# the ENV-first path instead (Default tier, so a live datacollectors.yml
# test: section still wins), before Rails boots.
require 'tmpdir'
ENV['DATACOLLECTOR_SERVICES_DEFAULT'] ||=
  '[{"name":"folderwatcherlocal","watcher_sleep":0},{"name":"filewatcherlocal","watcher_sleep":0},' \
  '{"name":"folderwatchersftp","watcher_sleep":0},{"name":"filewatchersftp","watcher_sleep":0}]'
ENV['DATACOLLECTOR_KEYDIR_DEFAULT'] ||= "#{Dir.home}/.ssh/"
ENV['DATACOLLECTOR_LOCALCOLLECTORS_DEFAULT'] ||= %([{"path":"#{Dir.mktmpdir(%w[chemotion_collector_test-])}"}])
ENV['DATACOLLECTOR_MAILCOLLECTOR__SERVER_DEFAULT'] ||= 'imap.server.de'
ENV['DATACOLLECTOR_MAILCOLLECTOR__MAIL_ADDRESS_DEFAULT'] ||= 'service@mail'
ENV['DATACOLLECTOR_MAILCOLLECTOR__PASSWORD_DEFAULT'] ||= 'password'
ENV['DATACOLLECTOR_MAILCOLLECTOR__ALIASES_DEFAULT'] ||= '["alias_one@kit.edu","alias_two@kit.edu"]'

require File.expand_path('../config/environment', __dir__)
require 'rspec/rails'
# require 'capybara/rails'
require 'database_cleaner'

require 'devise'
# Add additional requires below this line. Rails is not loaded until this point!

# Requires supporting ruby files with custom matchers and macros, etc, in
# spec/support/ and its subdirectories. Files matching `spec/**/*_spec.rb` are
# run as spec files by default. This means that files in spec/support that end
# in _spec.rb will both be required and run as specs, causing the specs to be
# run twice. It is recommended that you do not name files matching this glob to
# end with _spec.rb. You can configure this pattern with the --pattern
# option on the command line or in ~/.rspec, .rspec or `.rspec-local`.
#
# The following line is provided for convenience purposes. It has the downside
# of increasing the boot-up time by auto-requiring all files in the support
# directory. Alternatively, in the individual `*_spec.rb` files, manually
# require only the support files necessary.
#
Dir[Rails.root.join('spec/support/**/*.rb')].each { |f| require f }

ActiveRecord::Migration.maintain_test_schema!

RSpec.configure do |config|
  config.include RSpec::Rails::RequestExampleGroup,
                 type: :request, file_path: %r{ spec/api }
  config.use_transactional_fixtures = false

  config.infer_spec_type_from_file_location!

  # config.include Devise::TestHelpers, type: :controller
  # config.extend ControllerMacros, type: :controller
  config.include ControllerHelpers, type: :controller
  config.include Devise::Test::ControllerHelpers, type: :controller
  config.include LoginMacros
  config.include CapybaraHelpers
  config.include ReportHelpers
  config.include PubchemHelpers
  config.include DelayedJobHelpers
  config.include ActiveSupport::Testing::TimeHelpers
  config.include SbmmSpecHelpers

  config.file_fixture_path = 'spec/fixtures'
end
