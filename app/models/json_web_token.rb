# frozen_string_literal: true

class JsonWebToken
  # WP 05 (security baseline): default token lifetime, operator-tunable via
  # JWT_TTL_HOURS (Absolute tier). 336 hours = 2 weeks — the TTL the JSON login
  # (Usecases::Authentication::BuildToken) always had. NOTE: before WP 05 the
  # silent default here was 6 months (affected Usecases::Public::BuildToken,
  # the GraphQL sign-in and the OnlyOffice editor token); both entry points are
  # now aligned on the same 2-week default.
  DEFAULT_TTL_HOURS = 336

  def self.ttl
    Integer(ENV['JWT_TTL_HOURS'] || DEFAULT_TTL_HOURS).hours
  end

  def self.encode(payload, exp = ttl.from_now)
    payload[:exp] = exp.to_i
    JWT.encode(payload, Rails.application.secret_key_base, 'HS256')
  end

  def self.decode(token)
    decoded_token = JWT.decode(token, Rails.application.secret_key_base)
    payload = decoded_token[0]
    payload.with_indifferent_access
  rescue JWT::ExpiredSignature, JWT::VerificationError => e
    raise Errors::ExpiredSignature, e.message
  rescue JWT::DecodeError => e
    raise Errors::DecodeError, e.message
  end
end
