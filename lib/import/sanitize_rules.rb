# frozen_string_literal: true

module Import
  # P2 WP 01 (REQ-ELN-22): the import-side sanitation contract for copied
  # payload rows — pure hash -> hash, no AR. Three rules
  # (research/provenance-ids.md):
  #
  # 1. ancestry is NEVER trusted from a payload: parents are local ids of
  #    the source DB. The importer re-derives ancestry from its own uuid
  #    map; provenance rows preserve lineage instead. Attachment stores its
  #    ancestry in `version` (attachment.rb has_ancestry ancestry_column:
  #    :version); Container carries a legacy `ancestry` column next to its
  #    closure tree — both are dropped, never "fixed".
  # 2. logidze history never crosses a tenant boundary (data protection):
  #    log_data is stripped, the copy starts a fresh history.
  # 3. a payload row with a non-nil deleted_at is a tampered payload
  #    (export refuses soft-deleted sources) — hard error, never silently
  #    dropped.
  class SanitizeRules
    DeletedSourceError = Class.new(StandardError)

    ANCESTRY_KEYS = %w[ancestry].freeze
    LOG_KEYS = %w[log_data].freeze

    def self.sanitize!(type, fields)
      new.sanitize!(type, fields)
    end

    def sanitize!(type, fields)
      if fields['deleted_at'].present?
        raise DeletedSourceError,
              "#{type} row carries a non-nil deleted_at — refusing tampered payload"
      end

      cleaned = fields.except(*LOG_KEYS)
      # neutralize instead of delete: importers fetch('ancestry') and treat
      # blank as root — a removed key would raise KeyError
      ANCESTRY_KEYS.each { |key| cleaned[key] = nil if cleaned.key?(key) }
      cleaned = cleaned.except('version') if type == 'Attachment'
      cleaned
    end
  end
end
