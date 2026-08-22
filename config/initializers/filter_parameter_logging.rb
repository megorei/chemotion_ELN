# Be sure to restart your server when you modify this file.

# Configure sensitive parameters which will be filtered from the log file.
# :secret also covers client_secret / hmac_secret / receiving_secret via
# Rails' partial matching; :api_key covers cas_api_key (WP 05, REQ-ELN-5).
Rails.application.config.filter_parameters += %i[password secret api_key]
