# frozen_string_literal: true

class CollectionsMacromoleculeSample < ApplicationRecord
  acts_as_paranoid
  belongs_to :collection
  belongs_to :macromolecule_sample
  validates :collection, :macromolecule_sample, presence: true

  include Tagging
  include Collecting

  # TODO: prüfen ob die Methoden aus CollectionsSample nachimplementiert werden müssen
end
