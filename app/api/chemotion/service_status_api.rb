# frozen_string_literal: true

module Chemotion
  # P0 WP 04: admin-visible contract/version status of the shared services.
  class ServiceStatusAPI < Grape::API
    resource :admin do
      before { error!('401 Unauthorized', 401) unless current_user.is_a?(Admin) }

      desc 'Version/contract status of the configured shared services'
      get :service_status do
        { services: ServiceContract.check_all }
      end
    end
  end
end
