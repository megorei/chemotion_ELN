# frozen_string_literal: true

module Chemotion
  class AuthenticationAPI < Grape::API
    namespace :authentication do
      namespace :token do
        desc 'Generate Token'
        params do
          requires :username, type: String, desc: 'Username'
          requires :password, type: String, desc: 'Password'
        end
        post do
          token = Usecases::Authentication::BuildToken.execute!(params)
          if token.blank?
            AuditEvent.record(action: 'auth.login_failed', meta: { username: params[:username] }, ip: request.ip)
            error!('401 Unauthorized', 401)
          end
          user = User.where(name_abbreviation: params[:username]).or(User.where(email: params[:username])).take
          AuditEvent.record(action: 'auth.login', actor: user, meta: { username: params[:username] }, ip: request.ip)

          { token: token }
        end
      end
    end
  end
end
