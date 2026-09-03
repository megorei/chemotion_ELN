# frozen_string_literal: true

module Chemotion
  # P1 WP 05 (REQ-ELN-20) / P0 WP 09 stage 1: the admin-facing audit trail.
  # Read-only — audit_events rows are append-only at the model level.
  class AuditEventsAPI < Grape::API
    include Grape::Kaminari

    resource :admin do
      before { error!('401 Unauthorized', 401) unless current_user.is_a?(Admin) }

      namespace :audit_events do
        desc 'List audit events (newest first), filterable'
        params do
          optional :event_action, type: String, desc: "action filter, e.g. 'guest.invited'"
          # 'guest' means "guest activity": rows stamped actor_type=guest OR
          # whose actor is an external user — pre-P1 rows carry a real users
          # row (P1 deviation from the WP 09 contract, recorded there).
          optional :actor_type, type: String, values: AuditEvent::ACTOR_TYPES
          optional :actor_id, type: Integer
          optional :subject_type, type: String
          optional :subject_id, type: Integer
          optional :from, type: DateTime
          optional :to, type: DateTime
        end
        paginate per_page: 50, offset: 0, max_per_page: 200
        get do
          scope = AuditEvent.order(id: :desc)
          scope = scope.where(action: params[:event_action]) if params[:event_action].present?
          if params[:actor_type] == 'guest'
            scope = scope.where(actor_type: 'guest')
                         .or(scope.where(actor_id: User.where(external: true).select(:id)))
          elsif params[:actor_type].present?
            scope = scope.where(actor_type: params[:actor_type])
          end
          scope = scope.where(actor_id: params[:actor_id]) if params[:actor_id].present?
          scope = scope.where(subject_type: params[:subject_type]) if params[:subject_type].present?
          scope = scope.where(subject_id: params[:subject_id]) if params[:subject_id].present?
          scope = scope.where(created_at: params[:from]..) if params[:from].present?
          scope = scope.where(created_at: ..params[:to]) if params[:to].present?

          events = paginate(scope)
          actors = User.unscoped.where(id: events.map(&:actor_id).compact.uniq).index_by(&:id)
          present events, with: Entities::AuditEventEntity, root: :audit_events, actors: actors
        end

        desc 'Distinct actions present in the trail (for the filter dropdown)'
        get :actions do
          { actions: AuditEvent.distinct.order(:action).pluck(:action) }
        end
      end
    end
  end
end
