# frozen_string_literal: true

module Usecases
  module Guests
    # P1 WP 01 (REQ-ELN-16): first-login provisioning of a federated guest.
    #
    # Creates a Person marked +external+ (the WP's lighter default over a
    # dedicated STI type), keyed by the stable federated_id, with a random
    # Devise password (the account is federation-only; the password is never
    # communicated). Deliberately NO group memberships and no entitlement
    # mapping — guests must never inherit group shares (REQ-ELN-16).
    # The redeemed grant is attached (federated_id backfill) and activated.
    class Provision
      GENERATED_ABBREVIATION_ATTEMPTS = 50

      def self.execute!(grant:, attrs:)
        new(grant: grant, attrs: attrs).execute!
      end

      attr_reader :grant, :attrs

      def initialize(grant:, attrs:)
        @grant = grant
        @attrs = attrs
      end

      def execute!
        user = nil
        ActiveRecord::Base.transaction do
          user = create_guest!
          grant.attach!(federated_id: attrs[:federated_id], email: user.email)
          grant.activate!
        end
        AuditEvent.record(
          action: 'guest.provisioned',
          actor: user,
          subject: grant,
          meta: { federated_id: attrs[:federated_id], provider: attrs[:provider].to_s },
          ip: attrs[:ip],
        )
        user
      end

      private

      def create_guest!
        user = Person.create!(
          email: attrs[:email]&.downcase,
          first_name: attrs[:first_name].presence || 'Guest',
          last_name: attrs[:last_name].presence || 'User',
          name_abbreviation: generate_name_abbreviation,
          password: Devise.friendly_token[0, 20],
          external: true,
          federated_id: attrs[:federated_id],
          home_tenant_hint: attrs[:home_tenant_hint],
          providers: { attrs[:provider].to_s => attrs[:uid] },
        )
        # The grant IS the admission decision: a gated guest is active even
        # when DEVISE_NEW_ACCOUNT_INACTIVE holds new home signups for admin
        # approval (set_account_active before_create).
        user.update_columns(account_active: true) unless user.account_active # rubocop:disable Rails/SkipsModelValidations
        user
      end

      # Person abbreviations are 2-3 chars (leading letter). Derive from the
      # initials, then salt the third character until a free one is found.
      def generate_name_abbreviation
        pool = [*'a'..'z', *'0'..'9']
        candidates = [seed_abbreviation] +
                     Array.new(GENERATED_ABBREVIATION_ATTEMPTS) { "#{seed_abbreviation}#{pool.sample}" }
        candidates.find { |abbr| !User.with_deleted.exists?(name_abbreviation: abbr) } ||
          raise(ActiveRecord::RecordNotUnique, 'could not generate a free guest name abbreviation')
      end

      def seed_abbreviation
        @seed_abbreviation ||= begin
          seed = "#{attrs[:first_name]} #{attrs[:last_name]}".downcase.scan(/[a-z]/).first(2).join
          seed = "#{seed}gu"[0, 2]
          seed[0].match?(/[a-z]/) ? seed : "g#{seed[1]}"
        end
      end
    end
  end
end
