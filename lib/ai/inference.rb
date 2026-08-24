module Ai::Inference
  # REQ-ELN-28 (WP 02): the inference service is optional — return the
  # regular error payload instead of building a request against a nil host.
  NOT_CONFIGURED_BODY = { 'error' => 'Prediction service is not configured.' }.freeze

  def self.configured?
    config = Rails.configuration.try(:inference)
    config&.url.present? && config&.port.present?
  end

  def self.products(smis)
    return NOT_CONFIGURED_BODY unless configured?

    url = Rails.configuration.inference.url
    port = Rails.configuration.inference.port
    body = { reactants: [smis.join('.')] }
    begin
      rsp = HTTParty.post(
        "http://#{url}:#{port}/forward",
        body: body.to_json,
        timeout: 30,
        headers: { 'Content-Type' => 'application/json' },
      )
      JSON.parse(rsp.body)[0]
    rescue
      err_body = { 'error' => 'Prediction Sever not found. Please try again later.' }
      err_body
    end
  end

  def self.reactants(smis)
    return NOT_CONFIGURED_BODY unless configured?

    url = Rails.configuration.inference.url
    port = Rails.configuration.inference.port
    body = { products: [smis.join('.')] }
    begin
      rsp = HTTParty.post(
        "http://#{url}:#{port}/retro",
        body: body.to_json,
        timeout: 30,
        headers: { 'Content-Type' => 'application/json' },
      )
      JSON.parse(rsp.body)[0]
    rescue
      err_body = { 'error' => 'Prediction Sever not found. Please try again later.' }
      err_body
    end
  end
end
