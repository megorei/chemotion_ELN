# frozen_string_literal: true

module Usecases
  module Guests
    # P1 WP 02 (REQ-ELN-17): converts a guest's redeemable grants into real
    # CollectionShare rows. Runs on EVERY guest login (first login via
    # Provision, returning logins via the OmniAuth callback), so invitations
    # issued after the first login attach on the next one.
    #
    # Idempotent by design:
    # - a grant without a collection stays a pure login ticket (attach/activate
    #   only, nothing to convert);
    # - an existing share for (collection, guest) is left untouched — the
    #   owner may have edited it since conversion, and a re-login must not
    #   clobber that;
    # - expired grants are ignored entirely (they neither open the login door
    #   nor convert — see GuestGrant.redeemable).
    class RedeemGrants
      def self.execute!(user:)
        new(user: user).execute!
      end

      attr_reader :user

      def initialize(user:)
        @user = user
      end

      # @return [Array<GuestGrant>] the grants converted in this run
      def execute!
        converted = GuestGrant.redeemable_for(user).filter_map do |grant|
          redeem(grant)
        end
        audit(converted)
        converted
      end

      private

      # @return [GuestGrant, nil] the grant when a new share was written
      def redeem(grant)
        converted = nil
        ActiveRecord::Base.transaction(requires_new: true) do
          grant.attach!(federated_id: user.federated_id, email: user.email)
          converted = convert_to_share(grant)
          grant.activate!
        end
        converted
      end

      # @return [GuestGrant, nil] the grant when a new share was written
      def convert_to_share(grant)
        return if grant.collection_id.blank?

        share = CollectionShare.find_or_initialize_by(collection_id: grant.collection_id, shared_with_id: user.id)
        return unless share.new_record?

        share.assign_attributes(grant.share_attributes)
        share.save!
        grant.collection.update!(shared: true)
        grant
      end

      def audit(converted)
        return if converted.empty?

        AuditEvent.record(
          action: 'guest.grants_redeemed',
          actor: user,
          meta: {
            federated_id: user.federated_id,
            collection_ids: converted.map(&:collection_id),
            grant_ids: converted.map(&:id),
          },
        )
      end
    end
  end
end
