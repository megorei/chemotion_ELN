# frozen_string_literal: true

# Runs in after_initialize so Matrice is not autoloaded during initialization (an
# error in Rails 7). config.compute_config is read only at request time, so setting it
# once after boot matches the previous on_load(:active_record) behaviour.
Rails.application.config.after_initialize do
  Rails.application.configure do
    begin
      # WP 05: configs_with_secrets merges the encrypted hmac_secret /
      # receiving_secret back in (they are stripped from the configs JSONB).
      compute_config = if ActiveRecord::Base.connection.table_exists?('matrices')
                         Matrice.find_by(name: 'computedProp')&.configs_with_secrets || {}
                       else
                         {}
                       end
    rescue ActiveRecord::StatementInvalid, PG::ConnectionBad, PG::UndefinedTable
      compute_config = {}
    ensure
      # Local dev patch: if the begin block raised an unrescued error,
      # compute_config is nil here and the ensure would MASK the original
      # exception with a nil-crash.
      compute_config ||= {}
      config.compute_config = ActiveSupport::OrderedOptions.new
      config.compute_config.server = compute_config['server']
      config.compute_config.hmac_secret = compute_config['hmac_secret']
      config.compute_config.receiving_secret = compute_config['receiving_secret']
      config.compute_config.allowed_uids = compute_config['allowed_uids']
    end
  end
end
