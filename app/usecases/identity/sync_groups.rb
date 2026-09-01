# frozen_string_literal: true

module Usecases
  module Identity
    # REQ-ELN-6 (P0 WP 04): IdP attribute -> group auto-assignment as
    # per-tenant configuration. Called request-time from the OmniAuth
    # callback (never boot-wired — the RULES are tenant-set, only the
    # provider registration stays restart-required).
    #
    # Rule shape (tenant setting identity.group_rules, jsonb array):
    #   { "source": "entitlements" | "affiliation" | "isMemberOf",
    #     "match":  "<ruby regex source>",
    #     "group":  { "name_abbreviation": "X" }            # static target
    #             | { "first_name": "...", "last_name": "..." } }
    # Without "group", the first capture is interpreted in the legacy
    # dynamic format "group:<last_name>:<first_name>" (today's behaviour).
    # When NO tenant rules are configured, the built-in DEFAULT_RULES apply
    # unchanged — single-tenant behaviour stays identical.
    #
    # Deliberately ADDITIVE-ONLY (P0 decision, recorded in the WP): rules
    # never revoke memberships — revocation stays a manual admin act.
    class SyncGroups
      DEFAULT_RULES = [
        { 'source' => 'entitlements', 'match' => '(group:[^#]+)' }.freeze,
      ].freeze

      def self.execute!(user:, attributes:)
        new(user: user, attributes: attributes).execute!
      end

      attr_reader :user, :attributes

      def initialize(user:, attributes:)
        @user = user
        @attributes = attributes || {}
      end

      # @return [Array<Group>] the groups newly joined in this run
      def execute!
        # External guests never inherit group memberships (and thereby group
        # shares) from IdP attributes — REQ-ELN-16 (P1 WP 01).
        return [] if user.external?

        rules.filter_map { |rule| apply(rule) }.flatten.uniq.each_with_object([]) do |group, joined|
          next if user.groups.include?(group)

          user.groups << group
          joined << group
          audit(group)
        end
      end

      private

      def rules
        configured = tenant_rules
        configured.presence || DEFAULT_RULES
      end

      def tenant_rules
        raw = AppConfig.get(:identity, :group_rules)
        raw = JSON.parse(raw) if raw.is_a?(String) && raw.present?
        Array(raw).filter_map { |rule| normalize(rule) }
      rescue JSON::ParserError => e
        Rails.logger.warn("identity.group_rules unparseable: #{e.message}")
        []
      end

      def normalize(rule)
        rule = rule.transform_keys(&:to_s) if rule.respond_to?(:transform_keys)
        return unless rule.is_a?(Hash) && rule['source'].present? && rule['match'].present?

        rule
      end

      def apply(rule)
        regexp = Regexp.new(rule['match'])
        values_for(rule['source']).filter_map do |value|
          match = regexp.match(value.to_s)
          next unless match

          resolve_group(rule, match)
        end
      rescue RegexpError => e
        Rails.logger.warn("identity.group_rules bad regex #{rule['match'].inspect}: #{e.message}")
        []
      end

      def values_for(source)
        value = attributes[source] || attributes[source.to_s] || attributes[source.to_sym]
        Array(value).compact
      end

      def resolve_group(rule, match)
        target = rule['group']
        if target.is_a?(Hash)
          target = target.transform_keys(&:to_s)
          if target['name_abbreviation'].present?
            Group.find_by(name_abbreviation: target['name_abbreviation'])
          else
            Group.find_by(first_name: target['first_name'], last_name: target['last_name'])
          end
        else
          # legacy dynamic format: "group:<last_name>:<first_name>"
          parts = (match[1] || match[0]).split(':')
          Group.find_by(first_name: parts[2], last_name: parts[1]) if parts.size == 3
        end
      end

      def audit(group)
        AuditEvent.record(
          action: 'identity.group_assigned',
          actor: user,
          subject: group,
          meta: { group_id: group.id, federated_id: user.federated_id },
        )
      end
    end
  end
end
