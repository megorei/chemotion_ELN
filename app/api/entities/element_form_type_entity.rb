# frozen_string_literal: true

module Entities
  class ElementFormTypeEntity < ApplicationEntity
    root :element_form_types # root key when rendering a list of element form types

    expose :id
    expose :name
    expose :description
    expose :element_type
    expose :structure, default: {}
    expose :enabled

    # expose_timestamps
  end
end
