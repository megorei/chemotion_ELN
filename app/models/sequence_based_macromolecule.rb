# frozen_string_literal: true

class SequenceBasedMacromolecule < ApplicationRecord
  ACCESSION_FORMAT = /[OPQ][0-9][A-Z0-9]{3}[0-9]|[A-NR-Z][0-9]([A-Z][A-Z0-9]{2}[0-9]){1,2}/

  acts_as_paranoid
  has_many :sequence_based_macromolecule_samples
  has_many :collections, through: :sequence_based_macromolecule_samples
  belongs_to :protein_sequence_modification, optional: true
  belongs_to :post_translational_modification, optional: true
  belongs_to :parent, class_name: :sequence_based_macromolecule, optional: true

  accepts_nested_attributes_for(
    :sequence_based_macromolecule_samples,
    :protein_sequence_modification,
    :post_translational_modification
  )

  def primary_accession
    accessions.first
  end
end
