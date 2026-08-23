# frozen_string_literal: true

module Chemotion
  # WP 07 (REQ-ELN-14): the delegated configuration surface for group admins.
  # A dedicated group-scoped API — deliberately NOT a widening of the admin_*
  # surfaces: every route resolves the target group from the path and is
  # gated deny-by-default by require_group_admin! (instance Admins pass, a
  # group admin passes only for their own group — both users_admins and
  # user_roles grants are honored, see GroupAdminHelpers).
  #
  # Capabilities:
  # - default UI layout per group (jsonb users.default_profile_layout on the
  #   Group STI row; applied user-layout > group-default > profile_default.yml
  #   in ProfileAPI — the user's own profile stays overridable)
  # - group storage quota within the tenant budget (reuses the existing
  #   allocated_space column on the Group STI row and its long-standing
  #   semantics: Group#update_allocated_space raises every member's personal
  #   allocation to at least the group's. Budget source:
  #   ENV TENANT_STORAGE_QUOTA_GB via TenantContext, 0/unset = unlimited.
  #   Upload-time enforcement of the group aggregate is a documented
  #   follow-up — this WP delivers the delegated setting + validation.)
  # - group broadcast (recipients resolved server-side = group members; no
  #   client-supplied user_ids, unlike POST /messages/new)
  # - group text-template namespace (PersonalTextTemplate rows OWNED by the
  #   group STI user itself — the existing (user_id, name) unique index makes
  #   names unique per group, no schema change needed)
  class GroupSettingsAPI < Grape::API
    helpers GroupAdminHelpers

    rescue_from ActiveRecord::RecordNotFound do
      error!('404 Not found', 404)
    end

    rescue_from ActiveRecord::RecordInvalid do |e|
      error!(e.record.errors.full_messages.join(', '), 422)
    end

    rescue_from ActiveRecord::RecordNotUnique do
      error!('Name has already been taken', 422)
    end

    helpers do
      attr_reader :group

      # Whitelist for group default layouts: the stock element keys plus any
      # Labimotion element klass known to this instance.
      def known_layout_keys
        Profile::DEFAULT_LAYOUT.keys | Labimotion::ElementKlass.pluck(:name).map(&:to_s)
      end

      def validate_layout!(layout)
        unknown = layout.keys.map(&:to_s) - known_layout_keys
        error!("Unknown layout element(s): #{unknown.join(', ')}", 422) if unknown.any?

        non_integer = layout.values.reject { |v| v.is_a?(Integer) || v.to_s.match?(/\A-?\d+\z/) }
        error!('Layout values must be integers', 422) if non_integer.any?
      end

      # Sum of every OTHER group's quota + the requested value must fit the
      # tenant budget. A finite budget also rules out 0 (= unlimited) for a
      # single group. Groups still standing on the default 0 count as 0 in
      # the sum — the budget check bites when their quota is next edited.
      def validate_quota!(value)
        error!('allocated_space must be >= 0', 422) if value.negative?

        budget = TenantContext.current.storage_quota_bytes
        return unless budget.positive?

        error!('Unlimited quota (0) is not allowed within a finite tenant budget', 422) if value.zero?

        other_quotas = Group.where.not(id: group.id).sum(:allocated_space)
        return if other_quotas + value <= budget

        error!("Group quotas would exceed the tenant budget of #{TenantContext.current.storage_quota_gb} GB", 422)
      end

      def group_text_templates
        Usecases::TextTemplates::Personal.new(group)
      end
    end

    resource :group_settings do
      route_param :id, type: Integer do
        after_validation do
          @group = Group.find_by(id: params[:id])
          error!('404 Group not found', 404) if @group.nil?
          require_group_admin!(@group)
        end

        desc "Get the group's default UI layout"
        get :profile_layout do
          { default_profile_layout: group.default_profile_layout }
        end

        desc "Set the group's default UI layout (empty hash clears it)"
        params do
          requires :layout, type: Hash, desc: 'element key => sorting integer (negative = hidden)'
        end
        put :profile_layout do
          validate_layout!(params[:layout])
          normalized = params[:layout].to_h { |key, val| [key.to_s, val.to_i] }
          group.update!(default_profile_layout: normalized.presence)

          { default_profile_layout: group.default_profile_layout }
        end

        desc "Get the group's storage quota and the tenant budget"
        get :storage_quota do
          {
            allocated_space: group.allocated_space,
            tenant_storage_quota_gb: TenantContext.current.storage_quota_gb,
            groups_allocated_total: Group.sum(:allocated_space),
          }
        end

        desc "Set the group's storage quota in bytes (0 = unlimited); the sum " \
             'of all group quotas must stay within ENV TENANT_STORAGE_QUOTA_GB'
        params do
          requires :allocated_space, type: Integer, desc: 'quota in bytes (0 = unlimited)'
        end
        put :storage_quota do
          validate_quota!(params[:allocated_space])
          group.update!(allocated_space: params[:allocated_space])

          { allocated_space: group.reload.allocated_space }
        end

        desc 'Broadcast a message to all members of the group (recipients are resolved server-side)'
        params do
          requires :content, type: String, desc: 'message text'
        end
        post :broadcast do
          channel = Channel.find_by(subject: Channel::SEND_INDIVIDUAL_USERS)
          error!('404 Broadcast channel not configured', 404) if channel.nil?

          recipient_ids = group.users.ids
          message = Message.create_msg_notification(
            channel_id: channel.id,
            message_content: { data: params[:content] },
            message_from: current_user.id,
            message_to: recipient_ids,
          )
          error!('Message could not be created', 422) unless message&.persisted?

          { message_id: message.id, recipient_ids: recipient_ids }
        end

        namespace :text_templates do
          desc "List the group's text templates"
          get do
            templates = PersonalTextTemplate.where(user_id: group.id).order(id: :desc)
            present templates, with: Entities::TextTemplateEntity, root: :text_templates
          end

          desc 'Create a group text template'
          params do
            requires :name, type: String, desc: 'template name (unique within the group)'
            optional :data, type: Hash, desc: 'template data'
          end
          post do
            template = group_text_templates.create(name: params[:name], data: params[:data])
            present template, with: Entities::TextTemplateEntity
          end

          desc 'Update a group text template'
          params do
            requires :template_id, type: Integer, desc: 'template id'
            requires :name, type: String, desc: 'template name'
            optional :data, type: Hash, desc: 'template data'
          end
          put ':template_id' do
            template = group_text_templates.update(
              id: params[:template_id], name: params[:name], data: params[:data],
            )
            present template, with: Entities::TextTemplateEntity
          end

          desc 'Delete a group text template'
          params do
            requires :template_id, type: Integer, desc: 'template id'
          end
          delete ':template_id' do
            template = group_text_templates.destroy(id: params[:template_id])
            present template, with: Entities::TextTemplateEntity
          end
        end
      end
    end
  end
end
