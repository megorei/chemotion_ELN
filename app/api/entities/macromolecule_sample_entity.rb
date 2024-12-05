# frozen_string_literal: true

module Entities
  class MacromoleculeSampleEntity < ApplicationEntity
    expose! :name
    expose! :external_label
    expose! :short_label
    expose! :macromolecule, using: 'Entities::MacromoleculeEntity'
  end
end
