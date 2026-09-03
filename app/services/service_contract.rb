# frozen_string_literal: true

require 'net/http'

# P0 WP 04 (REQ-ELN-7 tail): version/contract gating for the pooled shared
# services. Uniform probe result per service:
#   { service:, configured:, reachable:, version:, expected:, ok:, error: }
# ok: true (contract satisfied) | false (MISMATCH — admin-visible config
# error, audited) | :unknown (service exposes no version endpoint — the
# check degrades to reachability; inventing failures would be worse).
# Read request-time via AppConfig, so tenant overrides apply. This runs
# behind the admin surface, never in a hot path.
module ServiceContract
  SERVICES = %i[converter spectra indigo ketcher].freeze
  TIMEOUT_S = 5

  module_function

  def check_all
    SERVICES.map { |name| check(name) }
  end

  def check(service)
    result = public_send("check_#{service}")
    audit_mismatch(result) if result[:ok] == false
    result
  end

  def check_indigo
    url = AppConfig.get(:indigo_service, :indigo_service_url)
    expected = AppConfig.get(:indigo_service, :expected_version)
    return unconfigured(:indigo, expected) if url.blank?

    body = http_get_json("#{url}v2/indigo/info")
    version = body&.dig('Indigo', 'version')
    build(:indigo, expected: expected, reachable: !body.nil?, version: version,
          ok: version_ok(version, expected))
  rescue StandardError => e
    unreachable(:indigo, expected, e)
  end

  def check_converter
    url = AppConfig.get(:converter, :url)
    expected = AppConfig.get(:converter, :expected_version)
    return unconfigured(:converter, expected) if url.blank?

    reachable = http_reachable?(url)
    build(:converter, expected: expected, reachable: reachable, version: nil,
          ok: reachable ? :unknown : false,
          error: reachable ? nil : 'unreachable')
  rescue StandardError => e
    unreachable(:converter, expected, e)
  end

  def check_spectra
    url = AppConfig.get(:spectra, :chemspectra, :url)
    expected = AppConfig.get(:spectra, :chemspectra, :expected_version)
    return unconfigured(:spectra, expected) if url.blank?

    reachable = http_reachable?(url)
    build(:spectra, expected: expected, reachable: reachable, version: nil,
          ok: reachable ? :unknown : false,
          error: reachable ? nil : 'unreachable')
  rescue StandardError => e
    unreachable(:spectra, expected, e)
  end

  def check_ketcher
    url = AppConfig.get(:ketcher_service, :url)
    return unconfigured(:ketcher, nil) if url.blank?

    # POST-only render endpoint, no version/health surface: configured-only.
    build(:ketcher, expected: nil, reachable: nil, version: nil, ok: :unknown)
  end

  # -- helpers ---------------------------------------------------------------

  def version_ok(version, expected)
    return :unknown if expected.blank?
    return false if version.blank?

    normalize(version) == normalize(expected)
  end

  def normalize(version)
    version.to_s.strip.delete_prefix('v')
  end

  def build(service, expected:, reachable:, version:, ok:, error: nil)
    { service: service, configured: true, reachable: reachable,
      version: version, expected: expected, ok: ok, error: error }
  end

  def unconfigured(service, expected)
    { service: service, configured: false, reachable: nil, version: nil,
      expected: expected, ok: :unknown, error: nil }
  end

  def unreachable(service, expected, exception)
    build(service, expected: expected, reachable: false, version: nil,
          ok: false, error: exception.message)
  end

  def http_get_json(url)
    response = http_request(url)
    return nil unless response.is_a?(Net::HTTPSuccess)

    JSON.parse(response.body)
  rescue JSON::ParserError
    nil
  end

  def http_reachable?(url)
    response = http_request(url)
    # any HTTP answer (incl. 401/404 on the base path) proves the endpoint
    # is alive; only connection-level failures count as unreachable
    !response.nil?
  rescue StandardError
    false
  end

  def http_request(url)
    uri = URI(url)
    http = Net::HTTP.new(uri.host, uri.port)
    http.use_ssl = uri.scheme == 'https'
    http.open_timeout = TIMEOUT_S
    http.read_timeout = TIMEOUT_S
    http.get(uri.path.presence || '/')
  end

  def audit_mismatch(result)
    AuditEvent.record(
      action: 'config.service_version_mismatch',
      actor: :system,
      meta: result.slice(:service, :version, :expected, :error).transform_keys(&:to_s),
    )
  end
end
