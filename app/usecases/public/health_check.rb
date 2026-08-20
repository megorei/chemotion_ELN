# frozen_string_literal: true

module Usecases
  module Public
    class HealthCheck
      def self.database_ready?
        ActiveRecord::Base.connection.select_value('SELECT 1') == 1
      rescue ActiveRecord::ConnectionNotEstablished, ActiveRecord::StatementInvalid, PG::Error
        false
      end
    end
  end
end
