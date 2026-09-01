# frozen_string_literal: true

require 'uri'

# P2 WP 01 (REQ-ELN-22): the URL-like provenance identifier —
#
#   chemotion://{instance}/{tenant}/{element_type}/{id}@{copied_at_iso}
#
# Single source of truth for building and parsing; pure value object, no AR.
# instance/tenant come from TenantContext; the timestamp pins the copy
# moment (the source may evolve afterwards). Stored, never derived — the
# ref survives domain renames.
class ProvenanceRef
  SCHEME = 'chemotion'
  FORMAT = %r{\A#{SCHEME}://(?<instance>[^/]+)/(?<tenant>[^/]+)/(?<element_type>[^/]+)/(?<id>\d+)(?:@(?<ts>.+))?\z}

  ParseError = Class.new(ArgumentError)

  attr_reader :instance, :tenant, :element_type, :id, :ts

  def self.build(record, ts: Time.current)
    context = TenantContext.current
    new(
      instance: context.instance_id,
      tenant: context.id || 'single',
      element_type: record.class.base_class.name,
      id: record.id,
      ts: ts&.utc&.iso8601,
    )
  end

  def self.parse(string)
    match = FORMAT.match(string.to_s.strip)
    raise ParseError, "not a #{SCHEME}:// provenance ref: #{string.inspect}" unless match

    new(
      instance: match[:instance],
      tenant: match[:tenant],
      element_type: match[:element_type],
      id: Integer(match[:id]),
      ts: match[:ts],
    )
  end

  def initialize(instance:, tenant:, element_type:, id:, ts: nil)
    @instance = instance
    @tenant = tenant
    @element_type = element_type
    @id = id
    @ts = ts
    freeze
  end

  def to_s
    base = "#{SCHEME}://#{instance}/#{tenant}/#{element_type}/#{id}"
    ts.present? ? "#{base}@#{ts}" : base
  end

  # Same deployment AND same tenant — the precondition for resolving the
  # ref to a local record (same-instance copy back-reference).
  def local?
    context = TenantContext.current
    instance == context.instance_id && tenant == (context.id || 'single')
  end

  def ==(other)
    other.is_a?(self.class) && to_s == other.to_s
  end
  alias eql? ==

  def hash = to_s.hash
end
