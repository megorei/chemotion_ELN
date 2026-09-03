module Chemotion::ScifinderNService
  # REQ-ELN-28 (WP 02): the SciFinder-n provider config is optional. All
  # entry points guard against an unconfigured provider and degrade
  # gracefully instead of nil-crashing (config.sfn_config.provider is nil
  # unless configured — see config/initializers/scifinder_n.rb).
  NOT_CONFIGURED_MESSAGE = 'SciFinder-n service is not configured'

  def self.provider
    Rails.configuration.try(:sfn_config)&.provider
  end

  def self.provider_access(access_token)
    sfn_provider = provider
    raise StandardError, NOT_CONFIGURED_MESSAGE if sfn_provider.blank?

    data = { grant_type: 'refresh_token', client_id: sfn_provider[:client_id], refresh_token: access_token }
    begin
      res = ScifinderN.retrieve_access(URI.join(sfn_provider[:sso], sfn_provider[:token_endpoint]), data)
      case res.code
      when 200
        token = res.dig('access_token')
        refresh_token = res.dig('refresh_token')
        expires_in = res.dig('expires_in')
        current_time = DateTime.now
        { access_token: token, refresh_token: refresh_token, expires_at: current_time + expires_in.seconds,
          updated_at: current_time }
      else
        raise StandardError, res.message
      end
    rescue StandardError => e
      raise e
    end
  end

  def self.provider_search(search, str, type, token)
    sfn_provider = provider
    return { errors: [NOT_CONFIGURED_MESSAGE] } if sfn_provider.blank?

    sfn_api = URI.join(sfn_provider[:host], "/api/v1/#{search}")
    data = { str_data: { ctype: "chemical/#{type}", str: str } }.to_json
    begin
      res = ScifinderN.search_api(sfn_api, data, token)
      case res.code
      when 200
        res.parsed_response.merge('host' => sfn_provider[:host])
      when 400
        { errors: ["#{res.message}. #{res.parsed_response['errors'][0]}"] }
      when 401
        { errors: ["#{res.message}. Please refresh your token."] }
      else
        { errors: [res.message] }
      end
    rescue StandardError => e
      raise e
    end
  end

  def self.provider_authorize(code, verifier)
    sfn_provider = provider
    raise StandardError, NOT_CONFIGURED_MESSAGE if sfn_provider.blank?

    data = {
      grant_type: 'authorization_code',
      client_id: sfn_provider[:client_id],
      redirect_uri: URI.join(sfn_provider[:redirect_host], sfn_provider[:redirect]),
      code_verifier: verifier,
      code: code,
    }
    begin
      res = ScifinderN.get_authorization(sfn_provider, data)
      case res.code
      when 200
        token = res.dig('access_token')
        refresh_token = res.dig('refresh_token')
        expires_in = res.dig('expires_in')
        current_time = DateTime.now
        {
          access_token: token,
          refresh_token: refresh_token,
          expires_at: current_time + expires_in.seconds,
          updated_at: current_time,
        }
      else
        raise StandardError, res.message
      end
    rescue StandardError => e
      raise e
    end
  end

  def self.provider_builder
    sfn_provider = provider
    return if sfn_provider.blank?

    res = ScifinderN.get_metadata(sfn_provider)
    return unless res&.success?

    sfn_provider[:sso] = res.headers.dig('location').first
    sfn_provider[:authorization_endpoint] = res.dig('authorization_endpoint')
    sfn_provider[:token_endpoint] = res.dig('token_endpoint')
    client_options = {
      site: sfn_provider[:host],
      authorize_url: URI.join(sfn_provider[:sso], sfn_provider[:authorization_endpoint]),
      token_url: URI.join(sfn_provider[:sso], sfn_provider[:token_endpoint]),
    }
    authorize_params = {
      scope: 'sfn-search openid',
      redirect_uri: URI.join(sfn_provider[:redirect_host], sfn_provider[:redirect]),
    }
    Rails.application.config.middleware.use OmniAuth::Builder do
      provider :oauth2, client_id: sfn_provider[:client_id],
                        pkce: true,
                        token_endpoint_auth_method: 'none',
                        authorize_params: authorize_params,
                        client_options: client_options
    end
  end
end
