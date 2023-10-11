# frozen_string_literal: true

module Chemotion
  class ElementFormTypeAPI < Grape::API
    resource :element_form_types do
      desc 'Index: List all element form types'
      get do
        present ElementFormType.order(:name), with: Entities::ElementFormTypeEntity
      end

      desc 'create a new element form type'
      params do
        requires :name, type: String
        optional :description, type: String
        requires :element_type, type: String, values: %w[sample reaction wellplate screen]
        optional :enabled, type: Boolean
      end
      post do
        element_form_type =
          ElementFormType.create!(
            creator: current_user,
            name: params[:name],
            description: params[:description],
            element_type: params[:element_type],
            enabled: params[:enabled],
          )
        present element_form_type, with: Entities::ElementFormTypeEntity
      end

      desc 'get element form type by id'
      params do
        requires :id, type: Integer, desc: 'element form type id'
      end
      route_param :id do
        get do
          present ElementFormType.find_by(id: params[:id]), with: Entities::ElementFormTypeEntity
        end
      end

      desc 'update a element form type'
      params do
        optional :id, type: Integer
        optional :name, type: String
        optional :description, type: String
        optional :element_type, type: String, values: %w[sample reaction wellplate screen]
        optional :enabled, type: Boolean
        optional :structure, type: Hash
      end
      put ':id' do
        element_form_type = ElementFormType.find_by(id: params[:id])
        element_form_type.update!(
          name: params[:name],
          description: params[:description],
          element_type: params[:element_type],
          enabled: params[:enabled],
          structure: params[:structure],
        )
        present element_form_type, with: Entities::ElementFormTypeEntity
      end

      desc 'update a element form type'
      delete ':id' do
        element_form_type = ElementFormType.find_by(id: params[:id])
        unless element_form_type.present? && element_form_type.destroy
          error!('element form type could not be deleted', 400)
        end

        { deleted: element_form_type.id }
      end
    end
  end
end
