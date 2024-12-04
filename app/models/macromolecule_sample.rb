# frozen_string_literal: true

class MacromoleculeSample < ApplicationRecord
  acts_as_paranoid

  has_many :collections_macromolecule_samples, inverse_of: :macromolecule_sample, dependent: :destroy
  has_many :collections, through: :collections_macromolecule_samples
  belongs_to :macromolecule

end
