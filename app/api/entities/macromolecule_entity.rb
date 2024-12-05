# frozen_string_literal: true

module Entities
  class MacromoleculeEntity < ApplicationEntity
    expose! :name
    expose! :uniprot_ids
  end
end
