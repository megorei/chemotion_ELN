# frozen_string_literal: true

class Macromolecule < ApplicationRecord
  acts_as_paranoid
  has_many :macromolecule_samples
  has_many :collections, through: :macromolecule_samples
end
