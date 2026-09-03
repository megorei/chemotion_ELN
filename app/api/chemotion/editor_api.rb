# frozen_string_literal: true

# rubocop:disable Rails/DurationArithmetic

module Chemotion
  # Editor API
  class EditorAPI < Grape::API
    helpers AttachmentHelpers

    namespace :editor do
      desc 'get editor config'
      get :initial do
        docserver = Rails.configuration.editors&.docserver
        { installed: (docserver && docserver[:enable]) || false, ext: docserver && docserver[:ext] }
      end

      route_param :id do
        desc 'start/stop editing a document'
        params do
          requires :id, type: Integer, desc: 'attachment id'
        end

        after_validation do
          @attachment = Attachment.find_by(id: params[:id])
          error!('401 Unauthorized', 401) unless @attachment && read_access?(@attachment, current_user)
        end

        get 'start' do
          # REQ-ELN-28 (WP 02): the docserver/imprint config is optional —
          # degrade with a clear error instead of a nil-crash 500.
          editors_config = Rails.configuration.editors
          docserver = editors_config&.docserver
          error!('OnlyOffice document server is not configured', 503) if docserver.blank?

          info = editors_config.info || {}
          error!('401 Unauthorized', 401) unless @attachment.editable_document?
          error!('401 Document is already being edited', 401) if @attachment.editing?
          payload = {
            att_id: @attachment.id,
            user_id: current_user.id,
            exp: (Time.zone.now + 15.minutes).to_i,
          }
          @attachment.editing_start!
          file_extension = @attachment.editable_document? && @attachment.file_extension
          token = JsonWebToken.encode(payload)
          only_office_payload = {
            width: '100%',
            height: '100%',
            type: 'desktop',
            document: {
              att_id: @attachment.id,
              fileType: file_extension,
              key: token,
              title: @attachment.filename,
              url: "#{docserver[:callback_server]}/api/v1/public/download?token=#{token}",
              permissions: {
                download: true,
                edit: true,
                fillForms: false,
                review: false,
              },
            },
            editorConfig: {
              callbackUrl: "#{docserver[:callback_server]}/api/v1/public/callback",
              mode: 'edit',
              lang: 'en',
              customization: {
                chat: false,
                compactToolbar: false,
                customer: {
                  address: info[:address],
                  info: info[:title],
                  logo: info[:logo],
                  mail: info[:mail],
                  name: info[:name],
                  www: info[:website],
                },
                feedback: {
                  url: info[:feedbackurl],
                  visible: false,
                },
                forcesave: false,
                help: false,
                logo: {
                  image: info[:logo],
                  imageEmbedded: info[:logo],
                  url: info[:website],
                },
                showReviewChanges: false,
                zoom: 100,
              },
            },
          }
          only_office_token = JWT.encode only_office_payload, Rails.configuration.only_office_secret_key_base

          { token: token, only_office_token: only_office_token }
        end

        get :end do
          @attachment.editing_end!
          { message: 'ok' }
        end
      end
    end
  end
end

# rubocop:enable Rails/DurationArithmetic
