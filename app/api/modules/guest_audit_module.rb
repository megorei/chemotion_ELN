# frozen_string_literal: true

# P1 WP 05 (REQ-ELN-20): central guest access audit at the Grape root
# (pattern: LogidzeModule). Two event families:
#
# guest.collection_opened — one event per guest+collection per WINDOW.
#   Opening a collection fires ~7 parallel element-index requests; the
#   dedupe is a DB-exists check on the [subject_type, subject_id] index
#   (store-independent — dev may run a null cache store), window 10 min.
#   Granularity decision (per collection open, never per element fetch)
#   is recorded in P0 WP 09's retention notes.
#
# guest.write_action — every mutating request by a guest, no dedupe
#   (guest writes are rare and each is materially interesting). Runs in a
#   +finally+ filter because +after+ is skipped when the endpoint throws
#   via error! — outcome: 'success' when the after-filter ran, 'denied'
#   otherwise (the precise refusal reason is carried by the specific
#   events, e.g. guest.escalation_denied).
module GuestAuditModule
  extend ActiveSupport::Concern

  READ_DEDUPE_WINDOW = 10.minutes
  MUTATING = %w[POST PUT PATCH DELETE].freeze

  # POST-as-query endpoints: mutating verb, read-only body (the payload —
  # a UI selection — is too complex for query params). Recording these as
  # guest.write_action is pure noise: /permissions/status alone fired ~7
  # events per page load in a live guest session (found 2026-09-02, no
  # dedupe on write_action by design since real writes are rare and each
  # matters — this route just isn't one). Matched on the route suffix, not
  # the full path (route.origin carries the version as the literal ":version"
  # placeholder, not the resolved value).
  QUERY_LIKE_ROUTES = ['/permissions/status'].freeze

  included do
    helpers do
      def guest_audit_actor
        user = current_user
        user if user.respond_to?(:external) && user.external
      rescue StandardError
        nil
      end

      def guest_audited_collection_id
        id = params[:collection_id] ||
             params.dig(:ui_state, :collection_id) ||
             params.dig(:currentCollection, :id)
        id ||= params[:id] if route&.origin.to_s.end_with?('/collections/:id')
        id.presence&.to_i
      rescue StandardError
        nil
      end

      def guest_audit_meta(user)
        { guest: true, federated_id: user.federated_id,
          home_tenant_hint: user.home_tenant_hint }
      end

      def record_guest_collection_opened(user, collection_id)
        recent = AuditEvent.where(action: 'guest.collection_opened',
                                  actor_id: user.id,
                                  subject_type: 'Collection', subject_id: collection_id)
                           .exists?(created_at: READ_DEDUPE_WINDOW.ago..)
        return if recent

        AuditEvent.record(
          action: 'guest.collection_opened',
          actor: user,
          subject: ['Collection', collection_id],
          meta: guest_audit_meta(user),
          ip: request.ip,
        )
      end
    end

    after do
      # Reached only on success (error! skips after-filters).
      @guest_request_succeeded = true
      user = guest_audit_actor
      if user && request.request_method == 'GET'
        collection_id = guest_audited_collection_id
        record_guest_collection_opened(user, collection_id) if collection_id
      end
    end

    finally do
      user = guest_audit_actor
      route_path = route&.origin.to_s
      if user && MUTATING.include?(request.request_method) &&
         QUERY_LIKE_ROUTES.none? { |suffix| route_path.end_with?(suffix) }
        AuditEvent.record(
          action: 'guest.write_action',
          actor: user,
          subject: (cid = guest_audited_collection_id) ? ['Collection', cid] : nil,
          meta: guest_audit_meta(user).merge(
            method: request.request_method,
            route: route_path,
            outcome: @guest_request_succeeded ? 'success' : 'denied',
          ),
          ip: request.ip,
        )
      end
    end
  end
end
