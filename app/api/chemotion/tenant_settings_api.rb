# frozen_string_literal: true

module Chemotion
  # WP 03 (REQ-ELN-31/8/9): admin surface over the AppConfig resolver — the
  # WP 04 backend brought forward (WP 04 only builds UI on top of this).
  #
  # GET  /api/v1/admin/tenant_settings          effective config with per-key
  #                                             provenance; Absolute-ENV keys
  #                                             are marked read_only, secrets
  #                                             are masked
  # PUT  /api/v1/admin/tenant_settings          write one tenant setting —
  #                                             whitelist-enforced, secret
  #                                             routing to the encrypted
  #                                             store, cache bust, audit
  #                                             'config.changed' (+
  #                                             'config.restart_requested'
  #                                             for boot-wired keys; the
  #                                             restart itself is operator-
  #                                             executed via chemop, ADR-007)
  class TenantSettingsAPI < Grape::API
    resource :admin do
      before { error!('401 Unauthorized', 401) unless current_user.is_a?(Admin) }

      namespace :tenant_settings do
        desc 'Effective configuration with provenance per key'
        params do
          optional :section, type: String, values: TenantSetting::SECTIONS,
                             desc: 'limit to one tenant-settable section'
        end
        get do
          sections = params[:section] ? [params[:section]] : TenantSetting::SECTIONS
          {
            sections: sections.index_with { |section| AppConfig.effective(section) },
            restart_required: AppConfig.restart_required,
          }
        end

        desc 'Write a tenant setting (DB tier of the resolver)'
        params do
          requires :section, type: String, desc: 'tenant-settable section'
          requires :key, type: String, regexp: TenantSetting::KEY_FORMAT,
                         desc: 'dot-joined key path inside the section'
          optional :value, desc: 'JSON value; null (or omitted) removes the override'
        end
        put do
          section = params[:section]
          key = params[:key]
          error!("section not tenant-settable: #{section}", 422) unless TenantSetting::SECTIONS.include?(section)

          secret = TenantSetting.secret_key?(section, key)
          TenantSetting.write(section: section, key: key, value: params[:value], updated_by: current_user)

          # never log the value — the audit trail records what changed, not secrets
          AuditEvent.record(action: 'config.changed', actor: current_user, ip: request.ip,
                            meta: { section: section, key: key, secret: secret })
          restart = AppConfig.restart_required?(section, key)
          if restart
            AuditEvent.record(action: 'config.restart_requested', actor: current_user, ip: request.ip,
                              meta: { section: section, key: key })
          end

          { section: section, key: key, secret: secret, restart_required: restart }
        end
      end
    end
  end
end
